from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class FrapCardioV2(Base):
    __tablename__ = "frap_cardio_v2"
    __table_args__ = (
        UniqueConstraint("intake_id", name="uq_frap_cardio_v2_intake_id"),
    )

    id = uuid_pk()

    company_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    intake_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("service_intake_v2.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Motivo / síntomas
    chief_complaint: Mapped[str | None] = mapped_column(String(80), nullable=True)
    chest_pain_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    pain_severity: Mapped[str | None] = mapped_column(String(20), nullable=True)
    symptom_onset: Mapped[str | None] = mapped_column(String(80), nullable=True)
    pain_radiation: Mapped[str | None] = mapped_column(Text, nullable=True)
    dyspnea: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    diaphoresis: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    nausea_vomiting: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    syncope: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    edema: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    palpitations: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # Evaluación cardio
    detected_rhythm: Mapped[str | None] = mapped_column(String(80), nullable=True)
    interpreted_heart_rate: Mapped[str | None] = mapped_column(String(80), nullable=True)
    low_output_signs: Mapped[str | None] = mapped_column(Text, nullable=True)
    suspected_acute_coronary_syndrome: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    suspected_stemi: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    cardiac_arrest: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    rosc: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    killip_class: Mapped[str | None] = mapped_column(String(40), nullable=True)
    ecg_performed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    ecg_findings: Mapped[str | None] = mapped_column(Text, nullable=True)
    interpreted_blood_pressure: Mapped[str | None] = mapped_column(String(80), nullable=True)
    peripheral_perfusion: Mapped[str | None] = mapped_column(String(80), nullable=True)

    # Intervenciones
    oxygen_administered: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    aspirin_administered: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    nitroglycerin_administered: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    iv_io_access: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    monitor_defibrillator: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    defibrillation_performed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    cardioversion_performed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    transcutaneous_pacing: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    cpr_performed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    assessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at = created_at_col()
    updated_at = updated_at_col()