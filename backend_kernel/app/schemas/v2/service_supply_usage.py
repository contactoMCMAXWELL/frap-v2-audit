from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ServiceSupplyUsageCreate(BaseModel):
    intake_id: UUID
    supply_id: UUID
    quantity: float = 1
    unit_cost: Optional[float] = None
    lot_number: str = ""
    notes: str = ""


class ServiceSupplyUsageOut(BaseModel):
    id: UUID
    company_id: UUID
    intake_id: UUID
    supply_id: UUID
    supply_name: str = ""
    unit_label: str = ""
    quantity: float
    unit_cost: float
    total_cost: float
    lot_number: str
    notes: str
    created_at: datetime

    class Config:
        from_attributes = True