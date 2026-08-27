from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class HospitalCatalogCreate(BaseModel):
    name: str
    level: str = ""
    address: str = ""
    phone: str = ""
    trauma_center: bool = False
    notes: str = ""
    active: bool = True


class HospitalCatalogPatch(BaseModel):
    name: str | None = None
    level: str | None = None
    address: str | None = None
    phone: str | None = None
    trauma_center: bool | None = None
    notes: str | None = None
    active: bool | None = None


class HospitalCatalogOut(BaseModel):
    id: UUID
    company_id: UUID
    name: str
    level: str = ""
    address: str = ""
    phone: str = ""
    trauma_center: bool = False
    notes: str = ""
    active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True