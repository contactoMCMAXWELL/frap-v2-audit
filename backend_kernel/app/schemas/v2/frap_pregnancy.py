from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FrapPregnancyV2Base(BaseModel):
    pregnancy_confirmed: bool | None = None
    gestational_weeks: str | None = None
    gravida: str | None = None
    para: str | None = None
    abortions: str | None = None
    c_sections: str | None = None
    last_menstrual_period: str | None = None
    prenatal_control: bool | None = None
    high_risk_pregnancy: bool | None = None
    multiple_pregnancy: bool | None = None

    abdominal_pain: bool | None = None
    vaginal_bleeding: bool | None = None
    fluid_leak: bool | None = None
    fetal_movements_present: bool | None = None
    contractions_present: bool | None = None
    contraction_frequency: str | None = None
    contraction_duration: str | None = None
    fetal_presentation: str | None = None
    crowning: bool | None = None
    urge_to_push: bool | None = None
    uterine_height: str | None = None
    uterine_tone: str | None = None
    fetal_heart_rate: str | None = None
    suspected_preeclampsia: bool | None = None
    suspected_eclampsia: bool | None = None
    pregnancy_trauma: bool | None = None

    active_labor: bool | None = None
    delivery_performed: bool | None = None
    birth_time: str | None = None
    newborn_sex: str | None = None
    apgar_1_min: str | None = None
    apgar_5_min: str | None = None
    placenta_delivered: bool | None = None
    placenta_complete: bool | None = None
    maternal_complications: str | None = None
    neonatal_complications: str | None = None
    neonatal_resuscitation: bool | None = None

    oxygen_administered: bool | None = None
    iv_access: bool | None = None
    hemorrhage_control: bool | None = None
    cord_clamping: bool | None = None
    skin_to_skin_contact: bool | None = None
    newborn_thermal_care: bool | None = None
    mother_destination: str | None = None
    newborn_destination: str | None = None

    notes: str | None = None
    active: bool = True


class FrapPregnancyV2Upsert(FrapPregnancyV2Base):
    intake_id: UUID
    assessed_at: Optional[datetime] = None


class FrapPregnancyV2Out(FrapPregnancyV2Base):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    intake_id: UUID
    assessed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime