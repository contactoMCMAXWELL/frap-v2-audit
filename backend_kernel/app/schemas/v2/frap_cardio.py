from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FrapCardioV2Base(BaseModel):
    chief_complaint: str | None = None
    chest_pain_type: str | None = None
    pain_severity: str | None = None
    symptom_onset: str | None = None
    pain_radiation: str | None = None
    dyspnea: bool | None = None
    diaphoresis: bool | None = None
    nausea_vomiting: bool | None = None
    syncope: bool | None = None
    edema: bool | None = None
    palpitations: bool | None = None

    detected_rhythm: str | None = None
    interpreted_heart_rate: str | None = None
    low_output_signs: str | None = None
    suspected_acute_coronary_syndrome: bool | None = None
    suspected_stemi: bool | None = None
    cardiac_arrest: bool | None = None
    rosc: bool | None = None
    killip_class: str | None = None
    ecg_performed: bool | None = None
    ecg_findings: str | None = None
    interpreted_blood_pressure: str | None = None
    peripheral_perfusion: str | None = None

    oxygen_administered: bool | None = None
    aspirin_administered: bool | None = None
    nitroglycerin_administered: bool | None = None
    iv_io_access: bool | None = None
    monitor_defibrillator: bool | None = None
    defibrillation_performed: bool | None = None
    cardioversion_performed: bool | None = None
    transcutaneous_pacing: bool | None = None
    cpr_performed: bool | None = None

    notes: str | None = None
    active: bool = True


class FrapCardioV2Upsert(FrapCardioV2Base):
    intake_id: UUID


class FrapCardioV2Out(FrapCardioV2Base):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    intake_id: UUID
    created_at: datetime
    updated_at: datetime