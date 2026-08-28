from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.frap_pediatrics_v2 import FrapPediatricsV2
from app.models.service_dispatch_event_v2 import ServiceDispatchEventV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.schemas.v2.frap_pediatrics import FrapPediatricsV2Out, FrapPediatricsV2Upsert
from app.services.license_guard import require_company_feature
from app.services.retrospective_guard import (
    require_retrospective_timestamp,
    require_retrospective_write_access,
    validate_semantic_timestamp,
)

router = APIRouter(prefix="/v2/frap-pediatrics", tags=["v2-frap-pediatrics"])


AGE_GROUP_LABELS = {
    "newborn": "Recién nacido",
    "neonate": "Neonato",
    "infant": "Lactante menor",
    "lactante": "Lactante",
    "toddler": "Preescolar menor",
    "preschool": "Preescolar",
    "school_age": "Escolar",
    "adolescent": "Adolescente",
}

BROSELOW_COLOR_LABELS = {
    "grey": "Gris",
    "pink": "Rosado",
    "red": "Rojo",
    "purple": "Morado",
    "yellow": "Amarillo",
    "white": "Blanco",
    "blue": "Azul",
    "orange": "Naranja",
    "green": "Verde",
}

PAT_LABELS = {
    "stable": "Estable",
    "abnormal_appearance": "Apariencia anormal",
    "respiratory_distress": "Dificultad respiratoria",
    "respiratory_failure": "Falla respiratoria",
    "shock": "Choque",
    "cns_metabolic_disorder": "Alteración SNC/metabólica",
    "cardiopulmonary_failure": "Falla cardiopulmonar",
    "critical": "Crítico",
}


def _safe_text(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _humanize_lookup(value: str | None, lookup: dict[str, str]) -> str:
    text = _safe_text(value)
    if not text:
        return ""
    return lookup.get(text.lower(), text)


def _build_summary(row: FrapPediatricsV2) -> str:
    parts: list[str] = []

    age_group = _humanize_lookup(row.age_group, AGE_GROUP_LABELS)
    if age_group:
        parts.append(age_group)

    if row.weight_kg is not None:
        parts.append(f"{float(row.weight_kg):g} kg")

    broselow = _humanize_lookup(row.broselow_color, BROSELOW_COLOR_LABELS)
    if broselow:
        parts.append(f"Broselow {broselow}")

    pat = _humanize_lookup(row.pediatric_assessment_triangle, PAT_LABELS)
    if pat:
        parts.append(f"PAT {pat}")

    return " · ".join(parts)


def _build_status(row: FrapPediatricsV2) -> str:
    if row.active is False:
        return "inactive"
    if _safe_text(row.pediatric_assessment_triangle) in {"critical", "cardiopulmonary_failure", "shock"}:
        return "critical"
    return "completed"


@router.get("/{intake_id}", response_model=FrapPediatricsV2Out)
def get_frap_pediatrics(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    _ = user
    require_company_feature(db, company_id, "clinical")

    row = (
        db.query(FrapPediatricsV2)
        .filter(
            FrapPediatricsV2.company_id == company_id,
            FrapPediatricsV2.intake_id == intake_id,
        )
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Pediatrics record not found")

    return row


@router.put("/", response_model=FrapPediatricsV2Out)
def upsert_frap_pediatrics(
    payload: FrapPediatricsV2Upsert,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "clinical")

    intake = (
        db.query(ServiceIntakeV2)
        .filter(
            ServiceIntakeV2.id == payload.intake_id,
            ServiceIntakeV2.company_id == company_id,
        )
        .first()
    )

    if not intake:
        raise HTTPException(status_code=404, detail="Intake not found")

    require_retrospective_write_access(intake, user)

    row = (
        db.query(FrapPediatricsV2)
        .filter(
            FrapPediatricsV2.company_id == company_id,
            FrapPediatricsV2.intake_id == payload.intake_id,
        )
        .first()
    )

    assessed_at_was_sent = "assessed_at" in payload.model_fields_set

    if assessed_at_was_sent:
        assessed_at = validate_semantic_timestamp(
            intake=intake,
            user=user,
            value=payload.assessed_at,
            field_name="assessed_at",
        )
    else:
        assessed_at = row.assessed_at if row is not None else None

    if row is None or assessed_at_was_sent:
        require_retrospective_timestamp(
            intake=intake,
            value=assessed_at,
            field_name="assessed_at",
        )

    data = payload.model_dump(exclude_unset=True)
    data.pop("intake_id", None)
    data["assessed_at"] = assessed_at

    if not row:
        row = FrapPediatricsV2(
            company_id=company_id,
            intake_id=payload.intake_id,
            **data,
        )
        db.add(row)
    else:
        for key, value in data.items():
            setattr(row, key, value)

    db.flush()

    summary = _build_summary(row)
    status = _build_status(row)

    event = ServiceDispatchEventV2(
        company_id=company_id,
        intake_id=intake.id,
        service_id=getattr(intake, "service_id", None),
        unit_id=getattr(intake, "unit_id", None),
        event_type="clinical.pediatrics_updated",
        occurred_at=row.assessed_at,
        status_label="Evaluación pediátrica actualizada",
        notes="Pediatrics V2 guardado/actualizado",
        event_payload={
            "module": "frap_pediatrics_v2",
            "intake_id": str(intake.id),
            "updated_by_user_id": str(getattr(user, "id", "")) if getattr(user, "id", None) else None,
            "summary": summary,
            "status": status,
            "fields": {
                "age_group": row.age_group,
                "estimated_age_value": row.estimated_age_value,
                "estimated_age_unit": row.estimated_age_unit,
                "weight_kg": float(row.weight_kg) if row.weight_kg is not None else None,
                "broselow_color": row.broselow_color,
                "caregiver_present": row.caregiver_present,
                "caregiver_name": row.caregiver_name,
                "pediatric_assessment_triangle": row.pediatric_assessment_triangle,
                "appearance": row.appearance,
                "work_of_breathing": row.work_of_breathing,
                "circulation_to_skin": row.circulation_to_skin,
                "capillary_refill_seconds": row.capillary_refill_seconds,
                "blood_glucose_mg_dl": row.blood_glucose_mg_dl,
                "pain_scale_flacc": row.pain_scale_flacc,
                "immunization_status": row.immunization_status,
                "suspected_abuse": row.suspected_abuse,
                "temperature_control": row.temperature_control,
                "notes": row.notes,
                "active": row.active,
            },
        },
    )
    db.add(event)

    db.commit()
    db.refresh(row)
    return row