from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class CompanyPdfConfig(Base):
    __tablename__ = "company_pdf_config"
    __table_args__ = (
        UniqueConstraint("company_id", name="uq_company_pdf_config_company_id"),
    )

    id = uuid_pk()

    company_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    include_legal_legend: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    legal_legend_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    include_signature_legend: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    signature_legend_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    include_footer_legend: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    footer_legend_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    include_privacy_notice: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    privacy_notice_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    include_insurance_legend: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    insurance_legend_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at = created_at_col()
    updated_at = updated_at_col()