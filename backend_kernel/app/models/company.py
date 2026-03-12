from __future__ import annotations

from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import uuid_pk, created_at_col, updated_at_col


class Company(Base):
    __tablename__ = "companies"

    id = uuid_pk()

    # Nombre visible
    name: Mapped[str] = mapped_column(String(120), nullable=False, default="")

    # Código único global y estable (MULTIEMPRESA REAL)
    code: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True, default="")

    # Datos empresa (para admin / branding / facturación)
    rfc: Mapped[str] = mapped_column(String(30), nullable=False, default="")
    address: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    phone: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    logo_url: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at = created_at_col()
    updated_at = updated_at_col()

    # Relaciones
    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    units = relationship("Unit", back_populates="company", cascade="all, delete-orphan")
    services = relationship("Service", back_populates="company", cascade="all, delete-orphan")
    fraps = relationship("Frap", back_populates="company", cascade="all, delete-orphan")
