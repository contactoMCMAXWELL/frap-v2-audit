from __future__ import annotations

import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user
from app.db.session import get_db
from app.models.company import Company
from app.models.event_participant_protection import (
    EventParticipant,
    EventParticipantProtection,
)
from app.models.service_intake_v2 import ServiceIntakeV2
from app.schemas.v2.event_participant_protection import (
    EventProtectionOut,
    EventProtectionUpsert,
    ParticipantCreatedOut,
    ParticipantPrivateOut,
    PublicEventProtectionOut,
    PublicParticipantCreate,
)

router = APIRouter(tags=["v2-event-participant-protection"])


def _guardia_or_404(db: Session, company_id: UUID, intake_id: UUID) -> ServiceIntakeV2:
    row = (
        db.query(ServiceIntakeV2)
        .filter(
            ServiceIntakeV2.id == intake_id,
            ServiceIntakeV2.company_id == company_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Guardia/evento no encontrado")
    if str(row.operation_mode or "").strip().lower() != "standby":
        raise HTTPException(
            status_code=409,
            detail="Protección de Participantes sólo puede activarse en una guardia/evento",
        )
    return row


def _protection_by_token(db: Session, public_token: str) -> EventParticipantProtection:
    row = (
        db.query(EventParticipantProtection)
        .filter(EventParticipantProtection.public_token == public_token)
        .first()
    )
    if not row or not row.enabled:
        raise HTTPException(status_code=404, detail="Evento no disponible")
    return row


@router.put(
    "/v2/event-participant-protection/{intake_id}",
    response_model=EventProtectionOut,
)
def upsert_event_protection(
    intake_id: UUID,
    payload: EventProtectionUpsert,
    db: Session = Depends(get_db),
    company_id: UUID = Depends(get_company_id),
    _user=Depends(get_current_user),
):
    guardia = _guardia_or_404(db, company_id, intake_id)

    row = (
        db.query(EventParticipantProtection)
        .filter(
            EventParticipantProtection.company_id == company_id,
            EventParticipantProtection.intake_id == intake_id,
        )
        .first()
    )

    if not row:
        row = EventParticipantProtection(
            company_id=company_id,
            intake_id=intake_id,
            public_token=secrets.token_urlsafe(32),
        )
        db.add(row)

    for key, value in payload.model_dump().items():
        setattr(row, key, value)

    if not row.public_event_name:
        row.public_event_name = guardia.standby_event_name or "Evento"

    db.commit()
    db.refresh(row)
    return row


@router.get(
    "/v2/event-participant-protection/{intake_id}",
    response_model=EventProtectionOut,
)
def get_event_protection(
    intake_id: UUID,
    db: Session = Depends(get_db),
    company_id: UUID = Depends(get_company_id),
    _user=Depends(get_current_user),
):
    _guardia_or_404(db, company_id, intake_id)
    row = (
        db.query(EventParticipantProtection)
        .filter(
            EventParticipantProtection.company_id == company_id,
            EventParticipantProtection.intake_id == intake_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Protección de Participantes no configurada")
    return row


@router.get(
    "/v2/event-participant-protection/{intake_id}/participants",
    response_model=list[ParticipantPrivateOut],
)
def list_event_participants(
    intake_id: UUID,
    db: Session = Depends(get_db),
    company_id: UUID = Depends(get_company_id),
    _user=Depends(get_current_user),
):
    _guardia_or_404(db, company_id, intake_id)
    protection = (
        db.query(EventParticipantProtection)
        .filter(
            EventParticipantProtection.company_id == company_id,
            EventParticipantProtection.intake_id == intake_id,
        )
        .first()
    )
    if not protection:
        return []

    return (
        db.query(EventParticipant)
        .filter(
            EventParticipant.company_id == company_id,
            EventParticipant.protection_id == protection.id,
        )
        .order_by(EventParticipant.created_at.asc())
        .all()
    )


@router.get(
    "/v2/public/events/{public_token}",
    response_model=PublicEventProtectionOut,
)
def get_public_event(public_token: str, db: Session = Depends(get_db)):
    protection = _protection_by_token(db, public_token)
    guardia = db.query(ServiceIntakeV2).filter(ServiceIntakeV2.id == protection.intake_id).first()
    company = db.query(Company).filter(Company.id == protection.company_id).first()

    if not guardia:
        raise HTTPException(status_code=404, detail="Evento no disponible")

    return {
        "public_token": protection.public_token,
        "event_type": protection.event_type,
        "public_event_name": protection.public_event_name or guardia.standby_event_name or "Evento",
        "organizer_name": protection.organizer_name,
        "registration_open": protection.registration_open,
        "registration_deadline": protection.registration_deadline,
        "organizer_logo_url": protection.organizer_logo_url,
        "cover_image_url": protection.cover_image_url,
        "organizer_message": protection.organizer_message,
        "gallery_json": protection.gallery_json or [],
        "privacy_notice_version": protection.privacy_notice_version,
        "event_starts_at": guardia.standby_starts_at,
        "event_ends_at": guardia.standby_ends_at,
        "event_location": guardia.location_text or None,
        "ambulance_company_name": company.name if company else None,
    }


@router.post(
    "/v2/public/events/{public_token}/participants",
    response_model=ParticipantCreatedOut,
    status_code=201,
)
def create_public_participant(
    public_token: str,
    payload: PublicParticipantCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    protection = _protection_by_token(db, public_token)

    now = datetime.now(timezone.utc)
    if not protection.registration_open:
        raise HTTPException(status_code=409, detail="El registro del evento está cerrado")
    if protection.registration_deadline and now > protection.registration_deadline:
        raise HTTPException(status_code=409, detail="El periodo de registro ha finalizado")

    first_name = payload.first_name.strip()
    paternal_surname = payload.paternal_surname.strip()
    if not first_name or not paternal_surname:
        raise HTTPException(status_code=422, detail="Nombre y apellido paterno son obligatorios")

    row = EventParticipant(
        company_id=protection.company_id,
        protection_id=protection.id,
        participant_token=secrets.token_urlsafe(32),
        status="INICIADO",
        source="public",
        participant_number=(payload.participant_number or "").strip() or None,
        first_name=first_name,
        paternal_surname=paternal_surname,
        maternal_surname=(payload.maternal_surname or "").strip() or None,
        birth_date=payload.birth_date,
        phone=(payload.phone or "").strip() or None,
        email=(payload.email or "").strip() or None,
        state_origin=(payload.state_origin or "").strip() or None,
        city_origin=(payload.city_origin or "").strip() or None,
        category=(payload.category or "").strip() or None,
        team_name=(payload.team_name or "").strip() or None,
        vehicle_type=(payload.vehicle_type or "").strip() or None,
        vehicle_number=(payload.vehicle_number or "").strip() or None,
        preloaded=False,
        last_participant_update_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "participant_id": row.id,
        "participant_token": row.participant_token,
        "status": row.status,
    }
