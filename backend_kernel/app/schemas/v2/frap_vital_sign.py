from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class FrapVitalSignV2Base(BaseModel):
    taken_at_label: str = ""
    blood_pressure: str = ""
    heart_rate: str = ""
    respiratory_rate: str = ""
    spo2: str = ""
    temperature: str = ""
    glucose: str = ""
    pain_scale: str = ""
    pupils: str = ""
    notes: str = ""


class FrapVitalSignV2Create(FrapVitalSignV2Base):
    intake_id: UUID
    taken_at: Optional[datetime] = None


class FrapVitalSignV2Out(FrapVitalSignV2Base):
    id: UUID
    company_id: UUID
    intake_id: UUID
    taken_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True