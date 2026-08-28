from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class FrapRefusalV2Base(BaseModel):
    refusal_type: str = ""
    refusal_reason: str = ""
    risks_explained: str = ""
    decision_capacity: str = ""
    patient_condition_at_refusal: str = ""
    witness_name: str = ""
    witness_relation: str = ""
    witness_phone: str = ""
    accepted_recommendations: str = ""
    advised_return_precautions: str = ""
    signature_pending: bool = True
    active: bool = True


class FrapRefusalV2Upsert(FrapRefusalV2Base):
    intake_id: UUID
    refused_at: Optional[datetime] = None


class FrapRefusalV2Out(FrapRefusalV2Base):
    id: UUID
    company_id: UUID
    intake_id: UUID
    refused_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True