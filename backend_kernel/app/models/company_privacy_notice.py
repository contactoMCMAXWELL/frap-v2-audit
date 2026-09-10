from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class CompanyPrivacyNotice(Base):
    __tablename__ = "company_privacy_notice"
    __table_args__ = (
        UniqueConstraint("company_id", "version", name="uq_company_privacy_notice_company_version"),
        CheckConstraint("status IN ('DRAFT', 'PUBLISHED')", name="ck_company_privacy_notice_status"),
    )

    id = uuid_pk()
    company_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="DRAFT", server_default="DRAFT", index=True
    )

    title: Mapped[str] = mapped_column(
        String(180), nullable=False, default="Aviso de Privacidad", server_default="Aviso de Privacidad"
    )
    content: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    responsible_name: Mapped[str] = mapped_column(
        String(180), nullable=False, default="", server_default=""
    )
    responsible_address: Mapped[str] = mapped_column(
        String(500), nullable=False, default="", server_default=""
    )
    privacy_email: Mapped[Optional[str]] = mapped_column(String(180), nullable=True)
    arco_email: Mapped[Optional[str]] = mapped_column(String(180), nullable=True)

    effective_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    published_by_user_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = created_at_col()
    updated_at = updated_at_col()
