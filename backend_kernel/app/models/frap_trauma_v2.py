from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class FrapTraumaV2(Base):
    __tablename__ = "frap_trauma_v2"

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

    trauma_type: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    mechanism: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    kinematics: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    safety_equipment: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    injured_regions: Mapped[str] = mapped_column(Text, nullable=False, default="")
    deformity: Mapped[str] = mapped_column(Text, nullable=False, default="")
    wounds: Mapped[str] = mapped_column(Text, nullable=False, default="")
    bleeding: Mapped[str] = mapped_column(Text, nullable=False, default="")
    burns: Mapped[str] = mapped_column(Text, nullable=False, default="")
    immobilization: Mapped[str] = mapped_column(Text, nullable=False, default="")
    trauma_priority: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    assessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at = created_at_col()
    updated_at = updated_at_col()