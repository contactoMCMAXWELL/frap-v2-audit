from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class FrapAssessmentV2(Base):
    __tablename__ = "frap_assessment_v2"
    __table_args__ = (
        UniqueConstraint("intake_id", name="uq_frap_assessment_v2_intake_id"),
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

    # Neurológico
    avpu: Mapped[str | None] = mapped_column(String(10), nullable=True)
    glasgow_eye: Mapped[int | None] = mapped_column(Integer, nullable=True)
    glasgow_verbal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    glasgow_motor: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # SAMPLE
    sample_s: Mapped[str | None] = mapped_column(Text, nullable=True)
    sample_a: Mapped[str | None] = mapped_column(Text, nullable=True)
    sample_m: Mapped[str | None] = mapped_column(Text, nullable=True)
    sample_p: Mapped[str | None] = mapped_column(Text, nullable=True)
    sample_l: Mapped[str | None] = mapped_column(Text, nullable=True)
    sample_e: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Impresión diagnóstica / triage
    impression_primary: Mapped[str | None] = mapped_column(Text, nullable=True)
    impression_secondary: Mapped[str | None] = mapped_column(Text, nullable=True)
    triage: Mapped[str | None] = mapped_column(String(20), nullable=True)

    created_at = created_at_col()
    updated_at = updated_at_col()