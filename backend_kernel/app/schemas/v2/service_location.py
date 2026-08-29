from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ServiceLocationV2Base(BaseModel):
    location_role: str
    place_type: Optional[str] = None

    name: str = ""
    address_text: str = ""
    reference: str = ""

    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)

    location_source: str = "unknown"

    sequence: int = 1
    active: bool = True


class ServiceLocationV2Create(ServiceLocationV2Base):
    pass


class ServiceLocationV2Out(ServiceLocationV2Base):
    id: UUID
    company_id: UUID
    intake_id: UUID

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
