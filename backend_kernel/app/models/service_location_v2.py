from __future__ import annotations

from typing import Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class ServiceLocationV2(Base):
    __tablename__ = "service_location_v2"

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

    location_role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    place_type: Mapped[Optional[str]] = mapped_column(
        String(40),
        nullable=True,
    )

    name: Mapped[str] = mapped_column(
        String(180),
        nullable=False,
        default="",
        server_default="",
    )

    address_text: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="",
        server_default="",
    )

    reference: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="",
        server_default="",
    )

    lat: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )

    lng: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )

    sequence: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    created_at = created_at_col()
    updated_at = updated_at_col()
