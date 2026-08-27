from __future__ import annotations

import uuid
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import uuid_pk, created_at_col, updated_at_col


class License(Base):
    __tablename__ = "licenses"

    id = uuid_pk()
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), nullable=False)

    plan_code: Mapped[str] = mapped_column(String(50))
    plan_name: Mapped[str] = mapped_column(String(100))

    status: Mapped[str] = mapped_column(String(20), default="trial")

    billing_cycle: Mapped[str] = mapped_column(String(20), default="monthly")

    starts_at: Mapped[DateTime] = mapped_column(DateTime)
    expires_at: Mapped[DateTime] = mapped_column(DateTime)

    grace_until: Mapped[DateTime] = mapped_column(DateTime, nullable=True)

    auto_renew: Mapped[bool] = mapped_column(Boolean, default=False)

    currency: Mapped[str] = mapped_column(String(10), default="USD")

    price: Mapped[int] = mapped_column(Integer, default=0)

    notes: Mapped[str] = mapped_column(String(500), nullable=True)

    created_at = created_at_col()
    updated_at = updated_at_col()

    limits = relationship("LicenseLimit", back_populates="license", uselist=False)
    features = relationship("LicenseFeature", back_populates="license")
    

class LicenseLimit(Base):
    __tablename__ = "license_limits"

    id = uuid_pk()

    license_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("licenses.id"))

    max_users: Mapped[int] = mapped_column(Integer, default=5)
    max_units: Mapped[int] = mapped_column(Integer, default=2)
    max_monthly_services: Mapped[int] = mapped_column(Integer, default=100)

    max_storage_gb: Mapped[int] = mapped_column(Integer, default=1)

    max_api_clients: Mapped[int] = mapped_column(Integer, default=0)

    created_at = created_at_col()

    license = relationship("License", back_populates="limits")


class LicenseFeature(Base):
    __tablename__ = "license_features"

    id = uuid_pk()

    license_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("licenses.id"))

    feature_code: Mapped[str] = mapped_column(String(100))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    config_json: Mapped[str] = mapped_column(String, nullable=True)

    created_at = created_at_col()

    license = relationship("License", back_populates="features")