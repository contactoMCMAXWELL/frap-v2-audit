from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class ServiceIntakeV2(Base):
    __tablename__ = "service_intake_v2"

    id = uuid_pk()

    company_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    service_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("services.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    incident_number: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    service_type: Mapped[str] = mapped_column(String(60), nullable=False, default="")
    service_subtype: Mapped[str] = mapped_column(String(60), nullable=False, default="")

    priority_operational: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    priority_clinical: Mapped[str] = mapped_column(String(30), nullable=False, default="routine")

    call_source: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    caller_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    caller_phone: Mapped[str] = mapped_column(String(40), nullable=False, default="")

    location_text: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    location_reference: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    lat: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    lng: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)

    patient_count_estimated: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    scene_risk: Mapped[str] = mapped_column(String(50), nullable=False, default="unknown")
    destination_suggested: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    payer_type: Mapped[str] = mapped_column(String(50), nullable=False, default="private")

    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    extra_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Captura temporal / retrospectiva
    capture_mode: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="realtime",
        server_default="realtime",
    )
    occurred_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    retrospective_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    retrospective_started_by_user_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    retrospective_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    approved_by_user_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at = created_at_col()
    updated_at = updated_at_col()