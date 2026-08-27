from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class FrapTraumaV2Base(BaseModel):
    trauma_type: str = ""
    mechanism: str = ""
    kinematics: str = ""
    safety_equipment: str = ""
    injured_regions: str = ""
    deformity: str = ""
    wounds: str = ""
    bleeding: str = ""
    burns: str = ""
    immobilization: str = ""
    trauma_priority: str = ""
    notes: str = ""
    active: bool = True


class FrapTraumaV2Upsert(FrapTraumaV2Base):
    intake_id: UUID


class FrapTraumaV2Out(FrapTraumaV2Base):
    id: UUID
    company_id: UUID
    intake_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True