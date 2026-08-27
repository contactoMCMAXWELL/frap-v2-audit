from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class CompanySupplyBase(BaseModel):
    name: str
    category: str = "general"
    unit_label: str = "pieza"
    sku: str = ""
    default_unit_cost: float = 0
    notes: str = ""
    active: bool = True


class CompanySupplyCreate(CompanySupplyBase):
    pass


class CompanySupplyUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit_label: Optional[str] = None
    sku: Optional[str] = None
    default_unit_cost: Optional[float] = None
    notes: Optional[str] = None
    active: Optional[bool] = None


class CompanySupplyOut(CompanySupplyBase):
    id: UUID
    company_id: UUID

    class Config:
        from_attributes = True