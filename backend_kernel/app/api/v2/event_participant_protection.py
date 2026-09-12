from __future__ import annotations

import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user
from app.db.session import get_db
from app.models.company import Company
from app.models.company_privacy_notice import CompanyPrivacyNotice
from app.models.event_participant_protection import (
    EventParticipant,
    EventParticipantAccessLog,
    EventParticipantConsent,
    EventParticipantEmergencyContact,
    EventParticipantMedicalProfile,
    EventParticipantProtection,
    EventParticipantServiceLink,
)
from app.models.service_intake_v2 import ServiceIntakeV2
from app.schemas.v2.event_participant_protection import (
    EventProtectionOut,
    EventProtectionUpsert,
    ParticipantCompletedOut,
    ParticipantCreatedOut,
    ParticipantServiceLinkCreate,
    ParticipantServiceLinkOut,
    PublicParticipantSelfOut,
    PublicParticipantQrValidationOut,
    ParticipantQrResolveOut,
    ParticipantQrPrintOut,
    ParticipantPrivateOut,
    PublicEventProtectionOut,
    PublicParticipantComplete,
    PublicParticipantCreate,
    PublicParticipantProgressUpdate,
)

router = APIRouter(tags=["v2-event-participant-protection"])

MEDICAL_PROFILE_ALLOWED_ROLES = {
    "SUPERADMIN",
    "ADMIN",
    "PARAMEDIC",
    "DOCTOR",
}


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


def _require_medical_profile_role(user) -> None:
    role = str(getattr(user, "role", "") or "").upper()
    if role not in MEDICAL_PROFILE_ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="No autorizado para consultar información médica sensible",
        )


def _participant_for_event_or_404(
    db: Session,
    company_id: UUID,
    intake_id: UUID,
    participant_id: UUID,
) -> tuple[EventParticipantProtection, EventParticipant]:
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
        raise HTTPException(
            status_code=404,
            detail="Protección de Participantes no configurada",
        )

    participant = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.id == participant_id,
            EventParticipant.company_id == company_id,
            EventParticipant.protection_id == protection.id,
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    return protection, participant


def _request_ip(request: Request) -> str | None:
    # No confiamos directamente en X-Forwarded-For porque puede ser enviado
    # por el cliente. Cuando el proxy de producción esté configurado como
    # confiable, esa política puede centralizarse.
    if request.client and request.client.host:
        return str(request.client.host)[:64]
    return None


def _register_access(
    db: Session,
    *,
    company_id: UUID,
    participant: EventParticipant,
    protection: EventParticipantProtection,
    user,
    request: Request,
    action: str,
    resource: str,
    reason: str | None = None,
) -> None:
    role = str(getattr(user, "role", "") or "").upper()
    extra_json = {
        "actor_name": getattr(user, "name", None),
        "actor_email": getattr(user, "email", None),
        "actor_role": role,
        "protection_id": str(protection.id),
        "intake_id": str(protection.intake_id),
    }

    row = EventParticipantAccessLog(
        company_id=company_id,
        participant_id=participant.id,
        user_id=getattr(user, "id", None),
        action=action,
        resource=resource,
        reason=(reason or "").strip() or None,
        ip_address=_request_ip(request),
        user_agent=(request.headers.get("user-agent") or "")[:500] or None,
        extra_json=extra_json,
    )
    db.add(row)
    db.commit()


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

    data = payload.model_dump()

    privacy_notice_version = str(
        data.get("privacy_notice_version") or ""
    ).strip()

    if privacy_notice_version:
        privacy_notice = (
            db.query(CompanyPrivacyNotice)
            .filter(
                CompanyPrivacyNotice.company_id == company_id,
                CompanyPrivacyNotice.version == privacy_notice_version,
                CompanyPrivacyNotice.status == "PUBLISHED",
                CompanyPrivacyNotice.published_at.isnot(None),
            )
            .first()
        )

        if not privacy_notice:
            raise HTTPException(
                status_code=422,
                detail=(
                    "La versión del Aviso de Privacidad seleccionada "
                    "no existe o no está publicada para esta empresa"
                ),
            )

        data["privacy_notice_version"] = privacy_notice_version

    for key, value in data.items():
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
        raise HTTPException(
            status_code=404,
            detail="Protección de Participantes no configurada",
        )
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
    "/v2/event-participant-protection/{intake_id}/participants/{participant_id}/qr-print",
    response_model=ParticipantQrPrintOut,
)
def get_participant_qr_print(
    intake_id: UUID,
    participant_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    company_id: UUID = Depends(get_company_id),
    user=Depends(get_current_user),
):
    protection, participant = _participant_for_event_or_404(
        db,
        company_id,
        intake_id,
        participant_id,
    )

    if str(participant.status or "").upper() == "CANCELADO":
        raise HTTPException(
            status_code=409,
            detail="El participante está cancelado",
        )

    display_name = " ".join(
        value.strip()
        for value in [
            participant.first_name or "",
            participant.paternal_surname or "",
            participant.maternal_surname or "",
        ]
        if value and value.strip()
    )

    _register_access(
        db,
        company_id=company_id,
        participant=participant,
        protection=protection,
        user=user,
        request=request,
        action="PRINT_PARTICIPANT_QR",
        resource="participant_qr",
    )

    return {
        "participant_id": participant.id,
        "participant_number": participant.participant_number,
        "display_name": display_name or "Participante",
        "qr_token": participant.qr_token,
        "qr_path": f"/participante/qr/{participant.qr_token}",
    }


@router.post(
    "/v2/event-participant-protection/{intake_id}/participant-service-links",
    response_model=ParticipantServiceLinkOut,
    status_code=201,
)
def create_participant_service_link(
    intake_id: UUID,
    payload: ParticipantServiceLinkCreate,
    request: Request,
    db: Session = Depends(get_db),
    company_id: UUID = Depends(get_company_id),
    user=Depends(get_current_user),
):
    protection, participant = _participant_for_event_or_404(
        db,
        company_id,
        intake_id,
        payload.participant_id,
    )

    service = (
        db.query(ServiceIntakeV2)
        .filter(
            ServiceIntakeV2.id == payload.intake_id,
            ServiceIntakeV2.company_id == company_id,
        )
        .first()
    )
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    if str(service.operation_mode or "").strip().lower() == "standby":
        raise HTTPException(
            status_code=409,
            detail="La guardia/evento raíz no puede vincularse como atención de un participante",
        )

    if service.parent_intake_id != intake_id:
        raise HTTPException(
            status_code=409,
            detail="El servicio no pertenece a esta guardia/evento",
        )

    existing = (
        db.query(EventParticipantServiceLink)
        .filter(
            EventParticipantServiceLink.company_id == company_id,
            EventParticipantServiceLink.intake_id == service.id,
        )
        .first()
    )
    if existing:
        if existing.participant_id == participant.id:
            return existing
        raise HTTPException(
            status_code=409,
            detail="El servicio ya está vinculado a otro participante",
        )

    row = EventParticipantServiceLink(
        company_id=company_id,
        participant_id=participant.id,
        intake_id=service.id,
        created_by_user_id=getattr(user, "id", None),
    )

    try:
        db.add(row)
        db.flush()

        role = str(getattr(user, "role", "") or "").upper()
        db.add(
            EventParticipantAccessLog(
                company_id=company_id,
                participant_id=participant.id,
                user_id=getattr(user, "id", None),
                action="LINK_SERVICE",
                resource="service_link",
                reason="Vinculación de participante con servicio del evento",
                ip_address=_request_ip(request),
                user_agent=(request.headers.get("user-agent") or "")[:500] or None,
                extra_json={
                    "actor_name": getattr(user, "name", None),
                    "actor_email": getattr(user, "email", None),
                    "actor_role": role,
                    "protection_id": str(protection.id),
                    "event_intake_id": str(protection.intake_id),
                    "service_intake_id": str(service.id),
                },
            )
        )

        db.commit()
        db.refresh(row)
    except Exception:
        db.rollback()
        raise

    return row


@router.get(
    "/v2/event-participant-protection/{intake_id}/participants/{participant_id}/medical-profile",
)
def get_participant_medical_profile(
    intake_id: UUID,
    participant_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    company_id: UUID = Depends(get_company_id),
    user=Depends(get_current_user),
):
    _require_medical_profile_role(user)
    protection, participant = _participant_for_event_or_404(
        db,
        company_id,
        intake_id,
        participant_id,
    )

    consent = (
        db.query(EventParticipantConsent)
        .filter(
            EventParticipantConsent.company_id == company_id,
            EventParticipantConsent.participant_id == participant.id,
        )
        .order_by(
            EventParticipantConsent.accepted_at.desc(),
            EventParticipantConsent.created_at.desc(),
        )
        .first()
    )

    if not consent or not (
        consent.privacy_notice_accepted
        and consent.sensitive_data_authorized
        and consent.information_confirmed
    ):
        raise HTTPException(
            status_code=403,
            detail="El participante no cuenta con autorización vigente para consultar datos médicos sensibles",
        )

    profile = (
        db.query(EventParticipantMedicalProfile)
        .filter(
            EventParticipantMedicalProfile.company_id == company_id,
            EventParticipantMedicalProfile.participant_id == participant.id,
        )
        .first()
    )

    emergency_contacts = (
        db.query(EventParticipantEmergencyContact)
        .filter(
            EventParticipantEmergencyContact.company_id == company_id,
            EventParticipantEmergencyContact.participant_id == participant.id,
        )
        .order_by(
            EventParticipantEmergencyContact.contact_order.asc(),
            EventParticipantEmergencyContact.created_at.asc(),
        )
        .all()
    )

    emergency_contacts_out = [
        {
            "contact_order": contact.contact_order,
            "name": contact.name,
            "relationship": contact.relationship,
            "phone": contact.phone,
            "present_at_event": contact.present_at_event,
        }
        for contact in emergency_contacts
    ]

    _register_access(
        db,
        company_id=company_id,
        participant=participant,
        protection=protection,
        user=user,
        request=request,
        action="VIEW_MEDICAL_PROFILE",
        resource="medical_profile",
    )

    if not profile:
        return {
            "participant_id": str(participant.id),
            "profile": None,
            "emergency_contacts": emergency_contacts_out,
            "declared_by_participant": True,
        }

    return {
        "participant_id": str(participant.id),
        "profile": {
            "blood_type": profile.blood_type,
            "allergies_json": profile.allergies_json or [],
            "allergies_detail": profile.allergies_detail,
            "conditions_json": profile.conditions_json or [],
            "conditions_detail": profile.conditions_detail,
            "medications_json": profile.medications_json or [],
            "uses_anticoagulants": profile.uses_anticoagulants,
            "surgeries_json": profile.surgeries_json or [],
            "recent_injury_detail": profile.recent_injury_detail,
            "implants_json": profile.implants_json or [],
            "medical_service_type": profile.medical_service_type,
            "insurer_name": profile.insurer_name,
            "policy_number": profile.policy_number,
            "affiliation_number": profile.affiliation_number,
            "transfer_preference": profile.transfer_preference,
            "preferred_hospital": profile.preferred_hospital,
            "emergency_notes": profile.emergency_notes,
            "suit_cut_authorized": profile.suit_cut_authorized,
            "protective_equipment_json": profile.protective_equipment_json or [],
            "declared_at": profile.declared_at,
        },
        "emergency_contacts": emergency_contacts_out,
        "declared_by_participant": True,
    }


@router.get(
    "/v2/event-participant-protection/participant-qr/{qr_token}",
    response_model=ParticipantQrResolveOut,
)
def resolve_participant_qr(
    qr_token: str,
    request: Request,
    db: Session = Depends(get_db),
    company_id: UUID = Depends(get_company_id),
    user=Depends(get_current_user),
):
    row = (
        db.query(EventParticipant, EventParticipantProtection)
        .join(
            EventParticipantProtection,
            EventParticipantProtection.id == EventParticipant.protection_id,
        )
        .filter(
            EventParticipant.qr_token == qr_token,
            EventParticipant.company_id == company_id,
            EventParticipantProtection.company_id == company_id,
            EventParticipantProtection.enabled.is_(True),
            EventParticipant.status != "CANCELADO",
        )
        .first()
    )

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Código no válido",
        )

    participant, protection = row

    _register_access(
        db,
        company_id=company_id,
        participant=participant,
        protection=protection,
        user=user,
        request=request,
        action="SCAN_PARTICIPANT_QR",
        resource="participant_qr",
    )

    return {
        "event_intake_id": protection.intake_id,
        "participant_id": participant.id,
    }

@router.get(
    "/v2/public/participant-qr/{qr_token}",
    response_model=PublicParticipantQrValidationOut,
)
def validate_public_participant_qr(
    qr_token: str,
    db: Session = Depends(get_db),
):
    participant = (
        db.query(EventParticipant)
        .join(
            EventParticipantProtection,
            EventParticipantProtection.id == EventParticipant.protection_id,
        )
        .filter(
            EventParticipant.qr_token == qr_token,
            EventParticipantProtection.enabled.is_(True),
            EventParticipant.status != "CANCELADO",
        )
        .first()
    )

    if not participant:
        return {
            "valid": False,
            "message": "Código no válido",
        }

    return {
        "valid": True,
        "message": "Participante registrado en el evento",
    }


@router.get(
    "/v2/public/events/{public_token}",
    response_model=PublicEventProtectionOut,
)
def get_public_event(public_token: str, db: Session = Depends(get_db)):
    protection = _protection_by_token(db, public_token)
    guardia = (
        db.query(ServiceIntakeV2)
        .filter(ServiceIntakeV2.id == protection.intake_id)
        .first()
    )
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
        raise HTTPException(
            status_code=422,
            detail="Nombre y apellido paterno son obligatorios",
        )

    row = EventParticipant(
        company_id=protection.company_id,
        protection_id=protection.id,
        participant_token=secrets.token_urlsafe(32),
        qr_token=secrets.token_urlsafe(32),
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


@router.get(
    "/v2/public/events/{public_token}/participants/{participant_token}",
    response_model=PublicParticipantSelfOut,
)
def get_public_participant(
    public_token: str,
    participant_token: str,
    db: Session = Depends(get_db),
):
    protection = _protection_by_token(db, public_token)

    participant = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.company_id == protection.company_id,
            EventParticipant.protection_id == protection.id,
            EventParticipant.participant_token == participant_token,
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    if str(participant.status or "").upper() == "CANCELADO":
        raise HTTPException(
            status_code=409,
            detail="La ficha del participante está cancelada",
        )

    contacts = (
        db.query(EventParticipantEmergencyContact)
        .filter(
            EventParticipantEmergencyContact.company_id == protection.company_id,
            EventParticipantEmergencyContact.participant_id == participant.id,
        )
        .order_by(EventParticipantEmergencyContact.contact_order.asc())
        .all()
    )

    profile = (
        db.query(EventParticipantMedicalProfile)
        .filter(
            EventParticipantMedicalProfile.company_id == protection.company_id,
            EventParticipantMedicalProfile.participant_id == participant.id,
        )
        .first()
    )

    latest_consent = (
        db.query(EventParticipantConsent)
        .filter(
            EventParticipantConsent.company_id == protection.company_id,
            EventParticipantConsent.participant_id == participant.id,
        )
        .order_by(
            EventParticipantConsent.accepted_at.desc(),
            EventParticipantConsent.created_at.desc(),
        )
        .first()
    )

    return {
        "participant_id": participant.id,
        "participant_token": participant.participant_token,
        "status": participant.status,
        "profile_completed_at": participant.profile_completed_at,
        "participant_number": participant.participant_number,
        "first_name": participant.first_name,
        "paternal_surname": participant.paternal_surname,
        "maternal_surname": participant.maternal_surname,
        "birth_date": participant.birth_date,
        "phone": participant.phone,
        "email": participant.email,
        "state_origin": participant.state_origin,
        "city_origin": participant.city_origin,
        "category": participant.category,
        "team_name": participant.team_name,
        "vehicle_type": participant.vehicle_type,
        "vehicle_number": participant.vehicle_number,
        "vehicle_make_model": participant.vehicle_make_model,
        "vehicle_color": participant.vehicle_color,
        "vehicle_plates": participant.vehicle_plates,
        "emergency_contacts": [
            {
                "contact_order": contact.contact_order,
                "name": contact.name,
                "relationship": contact.relationship,
                "phone": contact.phone,
                "present_at_event": contact.present_at_event,
            }
            for contact in contacts
        ],
        "medical_profile": (
            {
                "blood_type": profile.blood_type,
                "allergies_json": profile.allergies_json or [],
                "allergies_detail": profile.allergies_detail,
                "conditions_json": profile.conditions_json or [],
                "conditions_detail": profile.conditions_detail,
                "medications_json": profile.medications_json or [],
                "uses_anticoagulants": profile.uses_anticoagulants,
                "surgeries_json": profile.surgeries_json or [],
                "recent_injury_detail": profile.recent_injury_detail,
                "implants_json": profile.implants_json or [],
                "medical_service_type": profile.medical_service_type,
                "insurer_name": profile.insurer_name,
                "policy_number": profile.policy_number,
                "affiliation_number": profile.affiliation_number,
                "transfer_preference": profile.transfer_preference,
                "preferred_hospital": profile.preferred_hospital,
                "emergency_notes": profile.emergency_notes,
                "suit_cut_authorized": profile.suit_cut_authorized,
                "protective_equipment_json": profile.protective_equipment_json or [],
            }
            if profile
            else None
        ),
        "privacy_notice_version": (
            latest_consent.privacy_notice_version if latest_consent else None
        ),
        "privacy_notice_accepted": bool(
            latest_consent and latest_consent.privacy_notice_accepted
        ),
        "sensitive_data_authorized": bool(
            latest_consent and latest_consent.sensitive_data_authorized
        ),
        "information_confirmed": bool(
            latest_consent and latest_consent.information_confirmed
        ),
    }


@router.patch(
    "/v2/public/events/{public_token}/participants/{participant_token}",
    response_model=PublicParticipantSelfOut,
)
def update_public_participant_progress(
    public_token: str,
    participant_token: str,
    payload: PublicParticipantProgressUpdate,
    db: Session = Depends(get_db),
):
    protection = _protection_by_token(db, public_token)

    now = datetime.now(timezone.utc)
    if not protection.registration_open:
        raise HTTPException(status_code=409, detail="El registro del evento está cerrado")
    if protection.registration_deadline and now > protection.registration_deadline:
        raise HTTPException(status_code=409, detail="El periodo de registro ha finalizado")

    participant = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.company_id == protection.company_id,
            EventParticipant.protection_id == protection.id,
            EventParticipant.participant_token == participant_token,
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    if str(participant.status or "").upper() != "INICIADO":
        raise HTTPException(
            status_code=409,
            detail="Solo se puede guardar progresivamente una ficha en estado INICIADO",
        )

    first_name = payload.first_name.strip()
    paternal_surname = payload.paternal_surname.strip()
    if not first_name or not paternal_surname:
        raise HTTPException(
            status_code=422,
            detail="Nombre y apellido paterno son obligatorios",
        )

    try:
        participant.participant_number = (payload.participant_number or "").strip() or None
        participant.first_name = first_name
        participant.paternal_surname = paternal_surname
        participant.maternal_surname = (payload.maternal_surname or "").strip() or None
        participant.birth_date = payload.birth_date
        participant.phone = (payload.phone or "").strip() or None
        participant.email = (payload.email or "").strip() or None
        participant.state_origin = (payload.state_origin or "").strip() or None
        participant.city_origin = (payload.city_origin or "").strip() or None
        participant.category = (payload.category or "").strip() or None
        participant.team_name = (payload.team_name or "").strip() or None
        participant.vehicle_type = (payload.vehicle_type or "").strip() or None
        participant.vehicle_number = (payload.vehicle_number or "").strip() or None
        participant.vehicle_make_model = (payload.vehicle_make_model or "").strip() or None
        participant.vehicle_color = (payload.vehicle_color or "").strip() or None
        participant.vehicle_plates = (payload.vehicle_plates or "").strip() or None
        participant.last_participant_update_at = now

        if payload.emergency_contacts is not None:
            (
                db.query(EventParticipantEmergencyContact)
                .filter(
                    EventParticipantEmergencyContact.company_id == protection.company_id,
                    EventParticipantEmergencyContact.participant_id == participant.id,
                )
                .delete(synchronize_session=False)
            )

            for contact in sorted(
                payload.emergency_contacts,
                key=lambda item: item.contact_order,
            ):
                db.add(
                    EventParticipantEmergencyContact(
                        company_id=protection.company_id,
                        participant_id=participant.id,
                        contact_order=contact.contact_order,
                        name=contact.name.strip(),
                        relationship=contact.relationship.strip(),
                        phone=contact.phone.strip(),
                        present_at_event=contact.present_at_event,
                    )
                )

        if payload.medical_profile is not None:
            medical = payload.medical_profile
            profile = (
                db.query(EventParticipantMedicalProfile)
                .filter(
                    EventParticipantMedicalProfile.company_id == protection.company_id,
                    EventParticipantMedicalProfile.participant_id == participant.id,
                )
                .first()
            )
            if not profile:
                profile = EventParticipantMedicalProfile(
                    company_id=protection.company_id,
                    participant_id=participant.id,
                )
                db.add(profile)

            profile.blood_type = (medical.blood_type or "").strip() or None
            profile.allergies_json = medical.allergies_json
            profile.allergies_detail = (medical.allergies_detail or "").strip() or None
            profile.conditions_json = medical.conditions_json
            profile.conditions_detail = (medical.conditions_detail or "").strip() or None
            profile.medications_json = medical.medications_json
            profile.uses_anticoagulants = medical.uses_anticoagulants
            profile.surgeries_json = medical.surgeries_json
            profile.recent_injury_detail = (medical.recent_injury_detail or "").strip() or None
            profile.implants_json = medical.implants_json
            profile.medical_service_type = (medical.medical_service_type or "").strip() or None
            profile.insurer_name = (medical.insurer_name or "").strip() or None
            profile.policy_number = (medical.policy_number or "").strip() or None
            profile.affiliation_number = (medical.affiliation_number or "").strip() or None
            profile.transfer_preference = (medical.transfer_preference or "").strip() or None
            profile.preferred_hospital = (medical.preferred_hospital or "").strip() or None
            profile.emergency_notes = (medical.emergency_notes or "").strip() or None
            profile.suit_cut_authorized = medical.suit_cut_authorized
            profile.protective_equipment_json = medical.protective_equipment_json
            profile.declared_at = now

        db.commit()

    except Exception:
        db.rollback()
        raise

    return get_public_participant(
        public_token=public_token,
        participant_token=participant_token,
        db=db,
    )


@router.put(
    "/v2/public/events/{public_token}/participants/{participant_token}/complete",
    response_model=ParticipantCompletedOut,
)
def complete_public_participant(
    public_token: str,
    participant_token: str,
    payload: PublicParticipantComplete,
    request: Request,
    db: Session = Depends(get_db),
):
    protection = _protection_by_token(db, public_token)

    now = datetime.now(timezone.utc)
    if not protection.registration_open:
        raise HTTPException(status_code=409, detail="El registro del evento está cerrado")
    if protection.registration_deadline and now > protection.registration_deadline:
        raise HTTPException(status_code=409, detail="El periodo de registro ha finalizado")

    participant = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.company_id == protection.company_id,
            EventParticipant.protection_id == protection.id,
            EventParticipant.participant_token == participant_token,
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    if str(participant.status or "").upper() == "CANCELADO":
        raise HTTPException(
            status_code=409,
            detail="La ficha del participante está cancelada",
        )

    first_name = payload.first_name.strip()
    paternal_surname = payload.paternal_surname.strip()
    if not first_name or not paternal_surname:
        raise HTTPException(
            status_code=422,
            detail="Nombre y apellido paterno son obligatorios",
        )

    if not (
        payload.privacy_notice_accepted
        and payload.sensitive_data_authorized
        and payload.information_confirmed
    ):
        raise HTTPException(
            status_code=422,
            detail="Se requieren las tres confirmaciones para completar la ficha de seguridad",
        )

    try:
        participant.participant_number = (payload.participant_number or "").strip() or None
        participant.first_name = first_name
        participant.paternal_surname = paternal_surname
        participant.maternal_surname = (payload.maternal_surname or "").strip() or None
        participant.birth_date = payload.birth_date
        participant.phone = (payload.phone or "").strip() or None
        participant.email = (payload.email or "").strip() or None
        participant.state_origin = (payload.state_origin or "").strip() or None
        participant.city_origin = (payload.city_origin or "").strip() or None
        participant.category = (payload.category or "").strip() or None
        participant.team_name = (payload.team_name or "").strip() or None
        participant.vehicle_type = (payload.vehicle_type or "").strip() or None
        participant.vehicle_number = (payload.vehicle_number or "").strip() or None
        participant.vehicle_make_model = (payload.vehicle_make_model or "").strip() or None
        participant.vehicle_color = (payload.vehicle_color or "").strip() or None
        participant.vehicle_plates = (payload.vehicle_plates or "").strip() or None

        previous_status = str(participant.status or "").upper()
        if participant.profile_completed_at is None:
            participant.profile_completed_at = now
            participant.status = "COMPLETO"
        elif previous_status in {"COMPLETO", "ACTUALIZADO"}:
            participant.status = "ACTUALIZADO"
        else:
            participant.status = "COMPLETO"

        participant.last_participant_update_at = now

        (
            db.query(EventParticipantEmergencyContact)
            .filter(
                EventParticipantEmergencyContact.company_id == protection.company_id,
                EventParticipantEmergencyContact.participant_id == participant.id,
            )
            .delete(synchronize_session=False)
        )

        for contact in sorted(
            payload.emergency_contacts,
            key=lambda item: item.contact_order,
        ):
            db.add(
                EventParticipantEmergencyContact(
                    company_id=protection.company_id,
                    participant_id=participant.id,
                    contact_order=contact.contact_order,
                    name=contact.name.strip(),
                    relationship=contact.relationship.strip(),
                    phone=contact.phone.strip(),
                    present_at_event=contact.present_at_event,
                )
            )

        medical = payload.medical_profile
        profile = (
            db.query(EventParticipantMedicalProfile)
            .filter(
                EventParticipantMedicalProfile.company_id == protection.company_id,
                EventParticipantMedicalProfile.participant_id == participant.id,
            )
            .first()
        )
        if not profile:
            profile = EventParticipantMedicalProfile(
                company_id=protection.company_id,
                participant_id=participant.id,
            )
            db.add(profile)

        profile.blood_type = (medical.blood_type or "").strip() or None
        profile.allergies_json = medical.allergies_json
        profile.allergies_detail = (medical.allergies_detail or "").strip() or None
        profile.conditions_json = medical.conditions_json
        profile.conditions_detail = (medical.conditions_detail or "").strip() or None
        profile.medications_json = medical.medications_json
        profile.uses_anticoagulants = medical.uses_anticoagulants
        profile.surgeries_json = medical.surgeries_json
        profile.recent_injury_detail = (medical.recent_injury_detail or "").strip() or None
        profile.implants_json = medical.implants_json
        profile.medical_service_type = (medical.medical_service_type or "").strip() or None
        profile.insurer_name = (medical.insurer_name or "").strip() or None
        profile.policy_number = (medical.policy_number or "").strip() or None
        profile.affiliation_number = (medical.affiliation_number or "").strip() or None
        profile.transfer_preference = (medical.transfer_preference or "").strip() or None
        profile.preferred_hospital = (medical.preferred_hospital or "").strip() or None
        profile.emergency_notes = (medical.emergency_notes or "").strip() or None
        profile.suit_cut_authorized = medical.suit_cut_authorized
        profile.protective_equipment_json = medical.protective_equipment_json
        profile.declared_at = now

        consent = EventParticipantConsent(
            company_id=protection.company_id,
            participant_id=participant.id,
            privacy_notice_version=protection.privacy_notice_version,
            privacy_notice_accepted=payload.privacy_notice_accepted,
            sensitive_data_authorized=payload.sensitive_data_authorized,
            information_confirmed=payload.information_confirmed,
            accepted_at=now,
            audit_json={
                "source": "public",
                "protection_id": str(protection.id),
                "intake_id": str(protection.intake_id),
                "participant_id": str(participant.id),
                "ip_address": _request_ip(request),
                "user_agent": (request.headers.get("user-agent") or "")[:500] or None,
            },
        )
        db.add(consent)

        db.commit()
        db.refresh(participant)

    except Exception:
        db.rollback()
        raise

    return {
        "participant_id": participant.id,
        "participant_token": participant.participant_token,
        "status": participant.status,
        "profile_completed_at": participant.profile_completed_at,
    }
