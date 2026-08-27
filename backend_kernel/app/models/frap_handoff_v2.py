from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class FrapHandoffV2(Base):
    __tablename__ = "frap_handoff_v2"

    id = uuid_pk()

    company_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    intake_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("service_intake_v2.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        unique=True,
    )

    destination_hospital: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    receiving_person_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    receiving_person_role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    handoff_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    patient_final_condition: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    handoff_result: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    continuity_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    handoff_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at = created_at_col()
    updated_at = updated_at_col()