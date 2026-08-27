from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, uuid_pk


class ServiceDispatchEventV2(Base):
    __tablename__ = "service_dispatch_events_v2"

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

    service_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("services.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    unit_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("units.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status_label: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    event_payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    created_at = created_at_col()