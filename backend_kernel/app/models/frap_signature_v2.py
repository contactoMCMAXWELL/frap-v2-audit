from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class FrapSignatureV2(Base):
    __tablename__ = "frap_signatures_v2"
    __table_args__ = (
        UniqueConstraint("intake_id", "signature_role", name="uq_frap_signatures_v2_intake_role"),
    )

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
    )

    captured_by_user_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # operator | receiver | patient
    signature_role: Mapped[str] = mapped_column(String(30), nullable=False)

    signer_name: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    signer_role: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    signer_relation: Mapped[str] = mapped_column(String(100), nullable=False, default="")

    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    refused_to_sign: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    refusal_reason: Mapped[str] = mapped_column(Text, nullable=False, default="")

    device_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    geo_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    geo_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    geo_accuracy_m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    meta_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    signed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    created_at = created_at_col()
    updated_at = updated_at_col()