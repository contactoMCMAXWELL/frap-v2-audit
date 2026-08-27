from __future__ import annotations

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class Role(Base):
    __tablename__ = "roles"

    id = uuid_pk()

    name: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at = created_at_col()
    updated_at = updated_at_col()