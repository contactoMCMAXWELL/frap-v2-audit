# app/models/frap_event.py
from __future__ import annotations

import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base


class FrapEvent(Base):
    __tablename__ = "frap_events"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(PGUUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    frap_id = Column(PGUUID(as_uuid=True), ForeignKey("fraps.id", ondelete="CASCADE"), nullable=False)

    type = Column(String(50), nullable=False)
    data = Column(JSONB, nullable=True, server_default="{}")

    # ✅ Esta columna existe en tu DB (nullable)
    created_by = Column(PGUUID(as_uuid=True), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    ts = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    frap = relationship("Frap", back_populates="events")

    __table_args__ = (
        Index("ix_frap_events_company_frap", "company_id", "frap_id"),
        Index("ix_frap_events_company_frap_ts", "company_id", "frap_id", "ts"),
        Index("ix_frap_events_created_at", "created_at"),
    )
