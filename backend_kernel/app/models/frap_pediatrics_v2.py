from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class FrapPediatricsV2(Base):
    __tablename__ = "frap_pediatrics_v2"

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

    age_group: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    estimated_age_value: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    estimated_age_unit: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    weight_kg: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    broselow_color: Mapped[str] = mapped_column(String(30), nullable=False, default="")
    caregiver_present: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    caregiver_name: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    pediatric_assessment_triangle: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    appearance: Mapped[str] = mapped_column(Text, nullable=False, default="")
    work_of_breathing: Mapped[str] = mapped_column(Text, nullable=False, default="")
    circulation_to_skin: Mapped[str] = mapped_column(Text, nullable=False, default="")
    capillary_refill_seconds: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    blood_glucose_mg_dl: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    pain_scale_flacc: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    immunization_status: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    suspected_abuse: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    temperature_control: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    assessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at = created_at_col()
    updated_at = updated_at_col()