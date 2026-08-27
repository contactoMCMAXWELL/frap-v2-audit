from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class FrapRefusalV2(Base):
    __tablename__ = "frap_refusal_v2"

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

    refusal_type: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    refusal_reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
    risks_explained: Mapped[str] = mapped_column(Text, nullable=False, default="")
    decision_capacity: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    patient_condition_at_refusal: Mapped[str] = mapped_column(Text, nullable=False, default="")
    witness_name: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    witness_relation: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    witness_phone: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    accepted_recommendations: Mapped[str] = mapped_column(Text, nullable=False, default="")
    advised_return_precautions: Mapped[str] = mapped_column(Text, nullable=False, default="")
    signature_pending: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at = created_at_col()
    updated_at = updated_at_col()