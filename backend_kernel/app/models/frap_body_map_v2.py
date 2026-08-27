from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class FrapBodyMapV2(Base):
    __tablename__ = "frap_body_map_v2"
    __table_args__ = (
        UniqueConstraint("intake_id", name="uq_frap_body_map_v2_intake_id"),
    )

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

    status: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    anterior_regions: Mapped[list | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    posterior_regions: Mapped[list | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    injuries: Mapped[list | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at = created_at_col()
    updated_at = updated_at_col()