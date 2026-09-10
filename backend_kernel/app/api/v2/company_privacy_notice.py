from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.company_privacy_notice import CompanyPrivacyNotice
from app.models.event_participant_protection import EventParticipantProtection
from app.schemas.v2.company_privacy_notice import (
    CompanyPrivacyNoticeCreate,
    CompanyPrivacyNoticeOut,
    CompanyPrivacyNoticePatch,
    PublicPrivacyNoticeOut,
)

router = APIRouter(tags=["v2-company-privacy-notices"])
ALLOWED_ROLES = {"SUPERADMIN", "ADMIN"}


def _require_allowed_role(user) -> None:
    role = str(getattr(user, "role", "") or "").upper()
    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para administrar avisos de privacidad",
        )


def _clean_required(value: str, label: str) -> str:
    cleaned = str(value or "").strip()
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{label} es obligatorio",
        )
    return cleaned


def _clean_optional(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _notice_or_404(db: Session, company_id: UUID, notice_id: UUID) -> CompanyPrivacyNotice:
    row = (
        db.query(CompanyPrivacyNotice)
        .filter(
            CompanyPrivacyNotice.id == notice_id,
            CompanyPrivacyNotice.company_id == company_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Aviso de privacidad no encontrado")
    return row


def _version_exists(
    db: Session,
    company_id: UUID,
    version: str,
    exclude_id: UUID | None = None,
) -> bool:
    query = db.query(CompanyPrivacyNotice).filter(
        CompanyPrivacyNotice.company_id == company_id,
        CompanyPrivacyNotice.version == version,
    )
    if exclude_id is not None:
        query = query.filter(CompanyPrivacyNotice.id != exclude_id)
    return query.first() is not None


@router.get("/v2/company-privacy-notices", response_model=list[CompanyPrivacyNoticeOut])
def list_company_privacy_notices(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: UUID = Depends(get_company_id),
):
    _require_allowed_role(user)
    return (
        db.query(CompanyPrivacyNotice)
        .filter(CompanyPrivacyNotice.company_id == company_id)
        .order_by(CompanyPrivacyNotice.created_at.desc())
        .all()
    )


@router.post("/v2/company-privacy-notices", response_model=CompanyPrivacyNoticeOut, status_code=status.HTTP_201_CREATED)
def create_company_privacy_notice(
    payload: CompanyPrivacyNoticeCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: UUID = Depends(get_company_id),
):
    _require_allowed_role(user)

    version = _clean_required(payload.version, "La versión")
    if _version_exists(db, company_id, version):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un aviso de privacidad con esa versión",
        )

    row = CompanyPrivacyNotice(
        company_id=company_id,
        version=version,
        status="DRAFT",
        title=_clean_required(payload.title, "El título"),
        content=str(payload.content or "").strip(),
        responsible_name=str(payload.responsible_name or "").strip(),
        responsible_address=str(payload.responsible_address or "").strip(),
        privacy_email=_clean_optional(payload.privacy_email),
        arco_email=_clean_optional(payload.arco_email),
        effective_from=payload.effective_from,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/v2/company-privacy-notices/{notice_id}", response_model=CompanyPrivacyNoticeOut)
def get_company_privacy_notice(
    notice_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: UUID = Depends(get_company_id),
):
    _require_allowed_role(user)
    return _notice_or_404(db, company_id, notice_id)


@router.patch("/v2/company-privacy-notices/{notice_id}", response_model=CompanyPrivacyNoticeOut)
def patch_company_privacy_notice(
    notice_id: UUID,
    payload: CompanyPrivacyNoticePatch,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: UUID = Depends(get_company_id),
):
    _require_allowed_role(user)
    row = _notice_or_404(db, company_id, notice_id)

    if row.status == "PUBLISHED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un aviso publicado es inmutable; crea una nueva versión",
        )

    data = payload.model_dump(exclude_unset=True)

    if "version" in data:
        version = _clean_required(data["version"], "La versión")
        if _version_exists(db, company_id, version, exclude_id=row.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un aviso de privacidad con esa versión",
            )
        row.version = version

    if "title" in data:
        row.title = _clean_required(data["title"], "El título")
    if "content" in data:
        row.content = str(data["content"] or "").strip()
    if "responsible_name" in data:
        row.responsible_name = str(data["responsible_name"] or "").strip()
    if "responsible_address" in data:
        row.responsible_address = str(data["responsible_address"] or "").strip()
    if "privacy_email" in data:
        row.privacy_email = _clean_optional(data["privacy_email"])
    if "arco_email" in data:
        row.arco_email = _clean_optional(data["arco_email"])
    if "effective_from" in data:
        row.effective_from = data["effective_from"]

    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/v2/company-privacy-notices/{notice_id}/publish", response_model=CompanyPrivacyNoticeOut)
def publish_company_privacy_notice(
    notice_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: UUID = Depends(get_company_id),
):
    _require_allowed_role(user)
    row = _notice_or_404(db, company_id, notice_id)

    if row.status == "PUBLISHED":
        return row

    missing = []
    if not str(row.title or "").strip():
        missing.append("título")
    if not str(row.content or "").strip():
        missing.append("contenido")
    if not str(row.responsible_name or "").strip():
        missing.append("responsable")
    if not str(row.responsible_address or "").strip():
        missing.append("domicilio del responsable")
    if not str(row.arco_email or "").strip():
        missing.append("correo para derechos ARCO")

    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No se puede publicar. Faltan: " + ", ".join(missing),
        )

    row.status = "PUBLISHED"
    row.published_at = datetime.now(timezone.utc)
    row.published_by_user_id = getattr(user, "id", None)

    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get(
    "/v2/public/events/{public_token}/privacy-notice",
    response_model=PublicPrivacyNoticeOut,
)
def get_public_event_privacy_notice(
    public_token: str,
    db: Session = Depends(get_db),
):
    protection = (
        db.query(EventParticipantProtection)
        .filter(EventParticipantProtection.public_token == public_token)
        .first()
    )
    if not protection or not protection.enabled:
        raise HTTPException(status_code=404, detail="Evento no disponible")

    row = (
        db.query(CompanyPrivacyNotice)
        .filter(
            CompanyPrivacyNotice.company_id == protection.company_id,
            CompanyPrivacyNotice.version == protection.privacy_notice_version,
            CompanyPrivacyNotice.status == "PUBLISHED",
        )
        .first()
    )
    if not row or row.published_at is None:
        raise HTTPException(
            status_code=404,
            detail="Aviso de privacidad no disponible para este evento",
        )
    return row
