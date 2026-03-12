from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class AssignUnitIn(BaseModel):
    unit_id: Optional[UUID] = None


class TransitionIn(BaseModel):
    to_status: str = Field(..., min_length=1, max_length=30)


class ServiceCreate(BaseModel):
    """Payload to create a new Service from Dispatch."""

    priority: int = Field(..., ge=1, le=5)
    service_type: str = Field(..., min_length=1, max_length=50)

    location: str | None = Field(default=None, max_length=80)
    motive: str | None = Field(default=None, max_length=80)
    requested_by: str | None = Field(default=None, max_length=80)

    # If not provided, backend will default to "draft".
    status: str | None = Field(default=None, min_length=1, max_length=30)


class ServiceOut(BaseModel):
    id: UUID
    company_id: UUID

    unit_id: Optional[UUID] = None
    status: str
    # Enterprise list: relación “suave” al FRAP (puede ser null)
    frap_id: Optional[UUID] = None
    frap_folio: Optional[str] = None

    priority: int
    service_type: str
    location: Optional[str] = None
    motive: Optional[str] = None
    requested_by: Optional[str] = None

    created_at: datetime

    assigned_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    en_route_at: Optional[datetime] = None
    on_scene_at: Optional[datetime] = None
    transport_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True
