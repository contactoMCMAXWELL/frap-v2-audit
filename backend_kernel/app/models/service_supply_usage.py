from __future__ import annotations

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, uuid_pk


class ServiceSupplyUsage(Base):
    __tablename__ = "service_supply_usage"

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

    supply_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("company_supplies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    quantity: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=1)
    unit_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)

    lot_number: Mapped[str] = mapped_column(String(60), nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")

    created_at = created_at_col()