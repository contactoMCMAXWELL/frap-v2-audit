from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class UnitCreate(BaseModel):
    unit_code: str
    type: Optional[str] = ""
    plate: Optional[str] = ""
    active: bool = True


class UnitPatch(BaseModel):
    unit_code: Optional[str] = None
    type: Optional[str] = None
    plate: Optional[str] = None
    active: Optional[bool] = None


class UnitOut(BaseModel):
    id: UUID
    company_id: UUID
    unit_code: str
    type: str = ""
    status: str = "available"
    plate: str = ""
    year: str = ""
    model: str = ""
    gps_device_id: str = ""
    active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True