from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class FrapMedicationV2Base(BaseModel):
    medication_name: str
    dose: str = ""
    route: str = ""
    response: str = ""
    notes: str = ""


class FrapMedicationV2Create(FrapMedicationV2Base):
    intake_id: UUID


class FrapMedicationV2Out(FrapMedicationV2Base):
    id: UUID
    company_id: UUID
    intake_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True