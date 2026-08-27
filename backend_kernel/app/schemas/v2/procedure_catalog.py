from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class ProcedureCatalogCreate(BaseModel):
    name: str
    category: str = ""
    notes: str = ""
    active: bool = True


class ProcedureCatalogPatch(BaseModel):
    name: str | None = None
    category: str | None = None
    notes: str | None = None
    active: bool | None = None


class ProcedureCatalogOut(BaseModel):
    id: UUID
    company_id: UUID
    name: str
    category: str = ""
    notes: str = ""
    active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True