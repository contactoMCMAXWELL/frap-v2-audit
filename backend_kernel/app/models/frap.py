# app/models/frap.py
from __future__ import annotations

from sqlalchemy import DateTime, ForeignKey, String, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import uuid_pk


class Frap(Base):
    __tablename__ = "fraps"

    id = uuid_pk()

    company_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("services.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    folio: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    data: Mapped[dict] = mapped_column(JSON, nullable=False, server_default="{}")

    locked_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # IMPORTANT: required for lock/hash flow
    hash_final: Mapped[str | None] = mapped_column(String(128), nullable=True)

    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    company = relationship("Company", back_populates="fraps")
    service = relationship("Service", back_populates="frap")

    events = relationship("FrapEvent", back_populates="frap", cascade="all, delete-orphan")