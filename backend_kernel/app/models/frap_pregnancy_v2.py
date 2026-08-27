from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, updated_at_col, uuid_pk


class FrapPregnancyV2(Base):
    __tablename__ = "frap_pregnancy_v2"
    __table_args__ = (
        UniqueConstraint("intake_id", name="uq_frap_pregnancy_v2_intake_id"),
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

    # Identificación obstétrica
    pregnancy_confirmed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    gestational_weeks: Mapped[str | None] = mapped_column(String(20), nullable=True)
    gravida: Mapped[str | None] = mapped_column(String(20), nullable=True)
    para: Mapped[str | None] = mapped_column(String(20), nullable=True)
    abortions: Mapped[str | None] = mapped_column(String(20), nullable=True)
    c_sections: Mapped[str | None] = mapped_column(String(20), nullable=True)
    last_menstrual_period: Mapped[str | None] = mapped_column(String(80), nullable=True)
    prenatal_control: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    high_risk_pregnancy: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    multiple_pregnancy: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # Evaluación y motivo
    abdominal_pain: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    vaginal_bleeding: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    fluid_leak: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    fetal_movements_present: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    contractions_present: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    contraction_frequency: Mapped[str | None] = mapped_column(String(80), nullable=True)
    contraction_duration: Mapped[str | None] = mapped_column(String(80), nullable=True)
    fetal_presentation: Mapped[str | None] = mapped_column(String(80), nullable=True)
    crowning: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    urge_to_push: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    uterine_height: Mapped[str | None] = mapped_column(String(80), nullable=True)
    uterine_tone: Mapped[str | None] = mapped_column(String(80), nullable=True)
    fetal_heart_rate: Mapped[str | None] = mapped_column(String(40), nullable=True)
    suspected_preeclampsia: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    suspected_eclampsia: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    pregnancy_trauma: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # Parto y RN
    active_labor: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    delivery_performed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    birth_time: Mapped[str | None] = mapped_column(String(80), nullable=True)
    newborn_sex: Mapped[str | None] = mapped_column(String(20), nullable=True)
    apgar_1_min: Mapped[str | None] = mapped_column(String(10), nullable=True)
    apgar_5_min: Mapped[str | None] = mapped_column(String(10), nullable=True)
    placenta_delivered: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    placenta_complete: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    maternal_complications: Mapped[str | None] = mapped_column(Text, nullable=True)
    neonatal_complications: Mapped[str | None] = mapped_column(Text, nullable=True)
    neonatal_resuscitation: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # Intervenciones y cierre
    oxygen_administered: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    iv_access: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    hemorrhage_control: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    cord_clamping: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    skin_to_skin_contact: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    newborn_thermal_care: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    mother_destination: Mapped[str | None] = mapped_column(String(120), nullable=True)
    newborn_destination: Mapped[str | None] = mapped_column(String(120), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at = created_at_col()
    updated_at = updated_at_col()