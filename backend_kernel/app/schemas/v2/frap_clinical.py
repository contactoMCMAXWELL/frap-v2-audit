from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class FrapClinicalRecordV2Base(BaseModel):
    patient_name: str = ""
    patient_age: str = ""
    patient_sex: str = ""

    patient_birth_date: Optional[date] = None
    patient_identifier: Optional[str] = None
    patient_address: Optional[str] = None

    responsible_name: Optional[str] = None
    responsible_relationship: Optional[str] = None
    responsible_phone: Optional[str] = None

    pregnancy_status: Optional[str] = None
    gestational_weeks: Optional[int] = None

    allergies: str = ""
    current_medications: str = ""
    relevant_history: str = ""

    chief_complaint: str = ""
    mechanism_of_injury: str = ""
    clinical_impression: str = ""

    consciousness_level: str = ""
    airway_status: str = ""
    breathing_status: str = ""
    circulation_status: str = ""

    glasgow_eye: str = ""
    glasgow_verbal: str = ""
    glasgow_motor: str = ""
    glasgow_total: str = ""

    narrative: str = ""
    destination_outcome: str = ""
    refusal_of_care: bool = False
    active: bool = True


class FrapClinicalRecordV2Upsert(FrapClinicalRecordV2Base):
    intake_id: UUID


class FrapClinicalRecordV2Out(FrapClinicalRecordV2Base):
    id: UUID
    company_id: UUID
    intake_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True