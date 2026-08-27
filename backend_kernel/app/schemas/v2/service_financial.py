from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ServiceFinancialV2Base(BaseModel):
    crew_cost: float = 0
    unit_cost: float = 0
    fuel_cost: float = 0
    supplies_cost: float = 0
    other_cost: float = 0
    sale_price: float = 0
    payer_type: str = "private"
    billing_status: str = "draft"
    notes: str = ""
    active: bool = True


class ServiceFinancialV2Upsert(ServiceFinancialV2Base):
    intake_id: UUID


class ServiceFinancialV2Out(ServiceFinancialV2Base):
    id: UUID
    company_id: UUID
    intake_id: UUID
    total_cost: float
    margin_amount: float
    margin_percent: float

    class Config:
        from_attributes = True