from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.frap_signature_v2 import FrapSignatureV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.schemas.v2.frap_signature import (
    FrapSignatureValidationOut,
    FrapSignatureV2Out,
    FrapSignatureV2Upsert,
)
from app.services.frap_case_resolution import validate_case_signatures
from app.services.license_guard import require_company_feature
from app.services.retrospective_guard import (
    is_retrospective_intake,
    require_retrospective_timestamp,
    require_retrospective_write_access,
)
from app.services.timeline_service import create_dispatch_event

router = APIRouter(prefix="/v2/frap-signatures", tags=["v2-frap-signatures"])

READ_ROLES = {"SUPERADMIN", "ADMIN", "DISPATCH", "PARAMEDIC", "DOCTOR", "RECEIVER_MD", "AUDITOR"}
SIGN_OPERATOR_ROLES = {"SUPERADMIN", "ADMIN", "PARAMEDIC"}
SIGN_RECEIVER_ROLES = {"SUPERADMIN", "ADMIN", "DOCTOR", "RECEIVER_MD"}
SIGN_PATIENT_ROLES = {"SUPERADMIN", "ADMIN", "PARAMEDIC"}

ALLOWED_SIGNATURE_ROLES = {"operator", "receiver", "patient"}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_signature_role(value: str) -> str:
    role = str(value or "").strip().lower()
    aliases = {
        "operador": "operator",
        "paramedico": "operator",
        "paramédico": "operator",
        "receptor": "receiver",
        "doctor": "receiver",
        "autoridad": "receiver",
        "paciente": "patient",
        "responsable": "patient",
    }
    role = aliases.get(role, role)

    if role not in ALLOWED_SIGNATURE_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"signature_role inválido. Permitidos: {sorted(ALLOWED_SIGNATURE_ROLES)}",
        )
    return role


def _require_read_role(user) -> None:
    role = str(getattr(user, "role", "") or "").upper()
    if role not in READ_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")


def _require_sign_role(user, signature_role: str) -> None:
    role = str(getattr(user, "role", "") or "").upper()

    if signature_role == "operator" and role not in SIGN_OPERATOR_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado para firma operador")

    if signature_role == "receiver" and role not in SIGN_RECEIVER_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado para firma receptor")

    if signature_role == "patient" and role not in SIGN_PATIENT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado para firma paciente/responsable")


def _require_intake(db: Session, company_id: uuid.UUID, intake_id: uuid.UUID) -> ServiceIntakeV2:
    intake = (
        db.query(ServiceIntakeV2)
        .filter(
            ServiceIntakeV2.id == intake_id,
            ServiceIntakeV2.company_id == company_id,
        )
        .first()
    )
    if not intake:
        raise HTTPException(status_code=404, detail="Intake not found")
    return intake


def _validate_payload(payload: FrapSignatureV2Upsert, normalized_role: str, user) -> None:
    signer_name = str(payload.signer_name or "").strip()
    image_base64 = str(payload.image_base64 or "").strip()
    refused_to_sign = bool(payload.refused_to_sign)

    if normalized_role in {"operator", "receiver"}:
        if not signer_name:
            raise HTTPException(status_code=400, detail="signer_name es obligatorio")
        if not image_base64:
            raise HTTPException(status_code=400, detail="image_base64 es obligatorio")
        if refused_to_sign:
            raise HTTPException(status_code=400, detail="Solo patient puede marcar refused_to_sign")

    if normalized_role == "patient":
        if refused_to_sign:
            return
        if not signer_name:
            raise HTTPException(status_code=400, detail="signer_name es obligatorio para patient")
        if not image_base64:
            raise HTTPException(status_code=400, detail="image_base64 es obligatorio para patient")


@router.get("/{intake_id}", response_model=list[FrapSignatureV2Out])
def list_frap_signatures(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "clinical")
    _require_read_role(user)
    _require_intake(db, company_id, intake_id)

    return (
        db.query(FrapSignatureV2)
        .filter(
            FrapSignatureV2.company_id == company_id,
            FrapSignatureV2.intake_id == intake_id,
        )
        .order_by(FrapSignatureV2.signed_at.asc())
        .all()
    )


@router.put("/", response_model=FrapSignatureV2Out)
def upsert_frap_signature(
    payload: FrapSignatureV2Upsert,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "clinical")

    normalized_role = _normalize_signature_role(payload.signature_role)
    _require_sign_role(user, normalized_role)
    _validate_payload(payload, normalized_role, user)

    intake = _require_intake(
        db,
        company_id,
        payload.intake_id,
    )
    require_retrospective_write_access(intake, user)

    row = (
        db.query(FrapSignatureV2)
        .filter(
            FrapSignatureV2.company_id == company_id,
            FrapSignatureV2.intake_id == payload.intake_id,
            FrapSignatureV2.signature_role == normalized_role,
        )
        .first()
    )

    signed_at_was_sent = "signed_at" in payload.model_fields_set

    if is_retrospective_intake(intake):
        if signed_at_was_sent:
            signed_at = payload.signed_at
        else:
            signed_at = row.signed_at if row is not None else None

        if row is None or signed_at_was_sent:
            require_retrospective_timestamp(
                intake=intake,
                value=signed_at,
                field_name="signed_at",
            )
    else:
        signed_at = payload.signed_at or _now_utc()

    if not row:
        row = FrapSignatureV2(
            company_id=company_id,
            intake_id=payload.intake_id,
            signature_role=normalized_role,
        )

    signer_role = str(payload.signer_role or "").strip()
    if normalized_role == "operator" and not signer_role:
        signer_role = str(getattr(user, "role", "") or "").upper()

    row.captured_by_user_id = getattr(user, "id", None)
    row.signer_name = str(payload.signer_name or "").strip()
    row.signer_role = signer_role
    row.signer_relation = str(payload.signer_relation or "").strip()

    row.refused_to_sign = bool(payload.refused_to_sign)
    row.refusal_reason = str(payload.refusal_reason or "").strip()

    row.image_base64 = None if row.refused_to_sign else str(payload.image_base64 or "").strip()

    row.device_id = payload.device_id
    row.geo_lat = payload.geo_lat
    row.geo_lng = payload.geo_lng
    row.geo_accuracy_m = payload.geo_accuracy_m
    row.meta_json = payload.meta_json or {}
    row.signed_at = signed_at

    db.add(row)
    db.commit()
    db.refresh(row)

    create_dispatch_event(
        db=db,
        company_id=company_id,
        intake_id=payload.intake_id,
        event_type="clinical.signature_updated",
        status_label=f"Firma registrada: {normalized_role}",
        payload={
            "signature_role": normalized_role,
            "signer_name": row.signer_name,
            "signer_role": row.signer_role,
            "refused_to_sign": row.refused_to_sign,
        },
        occurred_at=row.signed_at,
    )

    return row


@router.get("/{intake_id}/validation", response_model=FrapSignatureValidationOut)
def validate_frap_signatures(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "clinical")
    _require_read_role(user)
    _require_intake(db, company_id, intake_id)

    result = validate_case_signatures(db, company_id, intake_id)
    return result