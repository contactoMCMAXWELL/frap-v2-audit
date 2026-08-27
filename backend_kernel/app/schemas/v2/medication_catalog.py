from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class MedicationCatalogCreate(BaseModel):
    name: str
    presentation: str = ""
    concentration: str = ""
    route: str = ""
    default_dose: str = ""
    notes: str = ""
    active: bool = True


class MedicationCatalogPatch(BaseModel):
    name: str | None = None
    presentation: str | None = None
    concentration: str | None = None
    route: str | None = None
    default_dose: str | None = None
    notes: str | None = None
    active: bool | None = None


class MedicationCatalogOut(BaseModel):
    id: UUID
    company_id: UUID
    name: str
    presentation: str = ""
    concentration: str = ""
    route: str = ""
    default_dose: str = ""
    notes: str = ""
    active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True