from __future__ import annotations

from typing import Optional

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym

from app.db.base import Base
from app.models.common import created_at_col, uuid_pk


class Unit(Base):
    __tablename__ = "units"

    id = uuid_pk()

    company_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Columna REAL en DB legacy
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    plate: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default=None)
    type: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, default=None)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at = created_at_col()

    company = relationship("Company", back_populates="units")

    # =========================
    # Compatibilidad V2
    # =========================
    unit_code = synonym("code")

    @property
    def status(self) -> str:
        return "available"

    @property
    def year(self) -> str:
        return ""

    @property
    def model(self) -> str:
        return ""

    @property
    def gps_device_id(self) -> str:
        return ""

    @property
    def updated_at(self):
        return self.created_at