from __future__ import annotations
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import uuid_pk, created_at_col, updated_at_col


class FrapAssessmentV2(Base):
    __tablename__ = "frap_assessment_v2"

    id = uuid_pk()

    intake_id: Mapped[str] = mapped_column(ForeignKey("service_intake_v2.id"), nullable=False)

    # Neurológico
    avpu: Mapped[str] = mapped_column(String, nullable=True)
    glasgow_eye: Mapped[int] = mapped_column(nullable=True)
    glasgow_verbal: Mapped[int] = mapped_column(nullable=True)
    glasgow_motor: Mapped[int] = mapped_column(nullable=True)

    # SAMPLE
    sample_s: Mapped[str] = mapped_column(Text, nullable=True)
    sample_a: Mapped[str] = mapped_column(Text, nullable=True)
    sample_m: Mapped[str] = mapped_column(Text, nullable=True)
    sample_p: Mapped[str] = mapped_column(Text, nullable=True)
    sample_l: Mapped[str] = mapped_column(Text, nullable=True)
    sample_e: Mapped[str] = mapped_column(Text, nullable=True)

    # Diagnóstico
    impression_primary: Mapped[str] = mapped_column(Text, nullable=True)
    impression_secondary: Mapped[str] = mapped_column(Text, nullable=True)
    triage: Mapped[str] = mapped_column(String, nullable=True)

    created_at = created_at_col()
    updated_at = updated_at_col()