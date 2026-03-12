from __future__ import annotations

from sqlalchemy import ForeignKey, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import uuid_pk, created_at_col


class User(Base):
    __tablename__ = "users"

    id = uuid_pk()

    company_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ÚNICO GLOBAL (multiempresa centralizada): un email no puede existir en 2 empresas.
    email: Mapped[str] = mapped_column(String(120), nullable=False, index=True, unique=True)

    # Nombre visible (lo vamos a usar como "full_name" en UI si quieres, pero en DB queda "name")
    name: Mapped[str] = mapped_column(String(120), nullable=False, default="")

    role: Mapped[str] = mapped_column(String(30), nullable=False, default="ADMIN")

    # Seguridad / control
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at = created_at_col()

    company = relationship("Company", back_populates="users")
