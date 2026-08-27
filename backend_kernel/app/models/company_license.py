from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class CompanyLicense(Base):
    __tablename__ = "company_licenses"

    id = uuid_pk()

    company_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        unique=True,
    )

    plan_code: Mapped[str] = mapped_column(String(40), nullable=False, default="BASIC")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")

    starts_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    max_users: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    max_units: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    max_services_month: Mapped[int] = mapped_column(Integer, nullable=False, default=300)

    features_json: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: {
            "frap_clinical_v2": True,
            "supplies": False,
            "financials": False,
            "gps_map": True,
            "whatsapp_share": True,
            "branded_pdf": True,
            "audit_plus": False,
        },
    )

    grace_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at = created_at_col()
    updated_at = updated_at_col()