from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class FrapAssessmentCreate(BaseModel):
    intake_id: UUID
    avpu: Optional[str] = None

    glasgow_eye: Optional[int] = None
    glasgow_verbal: Optional[int] = None
    glasgow_motor: Optional[int] = None

    sample_s: Optional[str] = None
    sample_a: Optional[str] = None
    sample_m: Optional[str] = None
    sample_p: Optional[str] = None
    sample_l: Optional[str] = None
    sample_e: Optional[str] = None

    impression_primary: Optional[str] = None
    impression_secondary: Optional[str] = None
    triage: Optional[str] = None


class FrapAssessmentOut(FrapAssessmentCreate):
    id: UUID

    class Config:
        from_attributes = True