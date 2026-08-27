from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, uuid_pk


class FrapVitalSignV2(Base):
    __tablename__ = "frap_vital_signs_v2"

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

    taken_at_label: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    blood_pressure: Mapped[str] = mapped_column(String(30), nullable=False, default="")
    heart_rate: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    respiratory_rate: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    spo2: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    temperature: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    glucose: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    pain_scale: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    pupils: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")

    created_at = created_at_col()