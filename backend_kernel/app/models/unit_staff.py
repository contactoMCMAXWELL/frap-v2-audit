from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, uuid_pk


class UnitStaff(Base):
    __tablename__ = "unit_staff"

    id = uuid_pk()

    company_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    assignment_role: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    shift_label: Mapped[str] = mapped_column(String(80), nullable=False, default="")

    created_at = created_at_col()