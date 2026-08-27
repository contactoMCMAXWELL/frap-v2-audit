from __future__ import annotations

from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class FrapClinicalRecordV2(Base):
    __tablename__ = "frap_clinical_record_v2"

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
        unique=True,
    )

    patient_name: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    patient_age: Mapped[str] = mapped_column(String(30), nullable=False, default="")
    patient_sex: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    patient_birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    patient_identifier: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    patient_address: Mapped[str] = mapped_column(String(255), nullable=False, default="")

    responsible_name: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    responsible_relationship: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    responsible_phone: Mapped[str] = mapped_column(String(50), nullable=False, default="")

    pregnancy_status: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    gestational_weeks: Mapped[int | None] = mapped_column(Integer, nullable=True)

    chief_complaint: Mapped[str] = mapped_column(String(250), nullable=False, default="")
    mechanism_of_injury: Mapped[str] = mapped_column(String(250), nullable=False, default="")
    clinical_impression: Mapped[str] = mapped_column(String(250), nullable=False, default="")

    consciousness_level: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    airway_status: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    breathing_status: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    circulation_status: Mapped[str] = mapped_column(String(50), nullable=False, default="")

    glasgow_eye: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    glasgow_verbal: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    glasgow_motor: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    glasgow_total: Mapped[str] = mapped_column(String(10), nullable=False, default="")

    allergies: Mapped[str] = mapped_column(Text, nullable=False, default="")
    current_medications: Mapped[str] = mapped_column(Text, nullable=False, default="")
    relevant_history: Mapped[str] = mapped_column(Text, nullable=False, default="")
    narrative: Mapped[str] = mapped_column(Text, nullable=False, default="")
    destination_outcome: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    refusal_of_care: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at = created_at_col()
    updated_at = updated_at_col()