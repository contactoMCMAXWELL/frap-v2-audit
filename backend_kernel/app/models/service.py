# app/models/service.py
from __future__ import annotations

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import uuid_pk


class Service(Base):
    __tablename__ = "services"

    id = uuid_pk()

    company_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    unit_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("units.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(String(30), nullable=False, server_default="draft")
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    service_type: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    location: Mapped[str | None] = mapped_column(String(80), nullable=True)
    motive: Mapped[str | None] = mapped_column(String(80), nullable=True)
    requested_by: Mapped[str | None] = mapped_column(String(80), nullable=True)

    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    assigned_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)

    en_route_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    on_scene_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    transport_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)

    company = relationship("Company", back_populates="services")
    frap = relationship("Frap", back_populates="service", uselist=False)
