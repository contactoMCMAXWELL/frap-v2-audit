from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FrapAssessmentV2Base(BaseModel):
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


class FrapAssessmentV2Upsert(FrapAssessmentV2Base):
    pass


class FrapAssessmentV2Out(FrapAssessmentV2Base):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    intake_id: UUID
    created_at: datetime
    updated_at: datetime