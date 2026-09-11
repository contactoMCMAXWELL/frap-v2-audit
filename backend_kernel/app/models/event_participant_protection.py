from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class EventParticipantProtection(Base):
    """Configuración de Protección de Participantes ligada a una guardia/evento V2."""

    __tablename__ = "event_participant_protection"
    __table_args__ = (
        UniqueConstraint("company_id", "intake_id", name="uq_event_participant_protection_company_intake"),
        UniqueConstraint("public_token", name="uq_event_participant_protection_public_token"),
    )

    id = uuid_pk()
    company_id = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    intake_id = mapped_column(UUID(as_uuid=True), ForeignKey("service_intake_v2.id", ondelete="CASCADE"), nullable=False, index=True)

    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    registration_open: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    public_token: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, default="otro")
    public_event_name: Mapped[str] = mapped_column(String(180), nullable=False, default="")
    organizer_name: Mapped[str] = mapped_column(String(180), nullable=False, default="")
    registration_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    organizer_logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    organizer_message: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    gallery_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    privacy_notice_version: Mapped[str] = mapped_column(String(40), nullable=False, default="1.0")
    extra_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    created_at = created_at_col()
    updated_at = updated_at_col()


class EventParticipant(Base):
    """Participante del evento. La precarga administrativa no equivale a consentimiento médico."""

    __tablename__ = "event_participant"
    __table_args__ = (
        UniqueConstraint("protection_id", "participant_token", name="uq_event_participant_token"),
    )

    id = uuid_pk()
    company_id = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    protection_id = mapped_column(UUID(as_uuid=True), ForeignKey("event_participant_protection.id", ondelete="CASCADE"), nullable=False, index=True)

    participant_token: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    qr_token: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="INICIADO", server_default="INICIADO", index=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="public", server_default="public")

    participant_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    paternal_surname: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    maternal_surname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    birth_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(180), nullable=True)
    state_origin: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    city_origin: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    team_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    vehicle_type: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    vehicle_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    vehicle_make_model: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    vehicle_color: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    vehicle_plates: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    preloaded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    profile_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_participant_update_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at = created_at_col()
    updated_at = updated_at_col()


class EventParticipantEmergencyContact(Base):
    __tablename__ = "event_participant_emergency_contact"

    id = uuid_pk()
    company_id = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_id = mapped_column(UUID(as_uuid=True), ForeignKey("event_participant.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    name: Mapped[str] = mapped_column(String(180), nullable=False, default="")
    relationship: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    phone: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    present_at_event: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at = created_at_col()
    updated_at = updated_at_col()


class EventParticipantMedicalProfile(Base):
    """Información declarada por el participante; no representa hallazgos clínicos del FRAP."""

    __tablename__ = "event_participant_medical_profile"
    __table_args__ = (UniqueConstraint("participant_id", name="uq_event_participant_medical_profile_participant"),)

    id = uuid_pk()
    company_id = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_id = mapped_column(UUID(as_uuid=True), ForeignKey("event_participant.id", ondelete="CASCADE"), nullable=False, index=True)

    blood_type: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    allergies_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    allergies_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    conditions_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    conditions_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    medications_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    uses_anticoagulants: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    surgeries_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    recent_injury_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    implants_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    medical_service_type: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    insurer_name: Mapped[Optional[str]] = mapped_column(String(180), nullable=True)
    policy_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    affiliation_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    transfer_preference: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    preferred_hospital: Mapped[Optional[str]] = mapped_column(String(180), nullable=True)
    emergency_notes: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    suit_cut_authorized: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    protective_equipment_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    declared_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at = created_at_col()
    updated_at = updated_at_col()


class EventParticipantConsent(Base):
    __tablename__ = "event_participant_consent"

    id = uuid_pk()
    company_id = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_id = mapped_column(UUID(as_uuid=True), ForeignKey("event_participant.id", ondelete="CASCADE"), nullable=False, index=True)
    privacy_notice_version: Mapped[str] = mapped_column(String(40), nullable=False)
    privacy_notice_accepted: Mapped[bool] = mapped_column(Boolean, nullable=False)
    sensitive_data_authorized: Mapped[bool] = mapped_column(Boolean, nullable=False)
    information_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    audit_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at = created_at_col()


class EventParticipantAccessLog(Base):
    """Auditoría inmutable de accesos a información del participante."""

    __tablename__ = "event_participant_access_log"

    id = uuid_pk()

    company_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    participant_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("event_participant.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    resource: Mapped[str] = mapped_column(String(80), nullable=False, default="participant")
    reason: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    extra_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at = created_at_col()

class EventParticipantServiceLink(Base):
    """Vínculo entre un participante registrado y un servicio hijo del evento."""

    __tablename__ = "event_participant_service_link"
    __table_args__ = (
        UniqueConstraint(
            "intake_id",
            name="uq_event_participant_service_link_intake",
        ),
    )

    id = uuid_pk()

    company_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    participant_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("event_participant.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    intake_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("service_intake_v2.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by_user_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at = created_at_col()
