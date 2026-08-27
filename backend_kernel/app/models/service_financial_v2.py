from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class ServiceFinancialV2(Base):
    __tablename__ = "service_financial_v2"

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
        unique=True,
        index=True,
    )

    crew_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    unit_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    fuel_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    supplies_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    other_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)

    total_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    sale_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    margin_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    margin_percent: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)

    payer_type: Mapped[str] = mapped_column(String(40), nullable=False, default="private")
    billing_status: Mapped[str] = mapped_column(String(40), nullable=False, default="draft")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at = created_at_col()
    updated_at = updated_at_col()