from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class FrapPediatricsV2Base(BaseModel):
    age_group: str = ""
    estimated_age_value: str = ""
    estimated_age_unit: str = ""
    weight_kg: str = ""
    broselow_color: str = ""
    caregiver_present: bool = False
    caregiver_name: str = ""
    pediatric_assessment_triangle: str = ""
    appearance: str = ""
    work_of_breathing: str = ""
    circulation_to_skin: str = ""
    capillary_refill_seconds: str = ""
    blood_glucose_mg_dl: str = ""
    pain_scale_flacc: str = ""
    immunization_status: str = ""
    suspected_abuse: bool = False
    temperature_control: str = ""
    notes: str = ""
    active: bool = True


class FrapPediatricsV2Upsert(FrapPediatricsV2Base):
    intake_id: UUID


class FrapPediatricsV2Out(FrapPediatricsV2Base):
    id: UUID
    company_id: UUID
    intake_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True