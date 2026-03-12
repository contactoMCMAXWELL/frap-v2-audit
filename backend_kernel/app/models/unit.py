# app/models/unit.py
from __future__ import annotations

from sqlalchemy import Boolean, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import uuid_pk, created_at_col, updated_at_col


class Unit(Base):
    __tablename__ = "units"

    id = uuid_pk()

    company_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    code: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(40), nullable=True)

    # ✅ Campo requerido para PDF legal (ya existe en DB desde migración inicial)
    plate: Mapped[str | None] = mapped_column(String(20), nullable=True)

    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    created_at = created_at_col()
    updated_at = updated_at_col()

    company = relationship("Company", back_populates="units")
