from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class FrapHandoffUpsert(BaseModel):

    intake_id: UUID

    destination_hospital: Optional[str] = None
    receiving_person_name: Optional[str] = None
    receiving_person_role: Optional[str] = None

    handoff_summary: Optional[str] = None
    patient_final_condition: Optional[str] = None
    handoff_result: Optional[str] = None
    continuity_notes: Optional[str] = None

    handoff_at: Optional[datetime] = None


class FrapHandoffOut(BaseModel):

    id: UUID
    company_id: UUID
    intake_id: UUID

    destination_hospital: Optional[str]
    receiving_person_name: Optional[str]
    receiving_person_role: Optional[str]

    handoff_summary: Optional[str]
    patient_final_condition: Optional[str]
    handoff_result: Optional[str]
    continuity_notes: Optional[str]

    handoff_at: Optional[datetime]

    class Config:
        from_attributes = True