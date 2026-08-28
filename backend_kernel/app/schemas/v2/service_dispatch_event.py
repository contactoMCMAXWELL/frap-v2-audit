from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ServiceDispatchEventV2Base(BaseModel):
    intake_id: UUID
    service_id: Optional[UUID] = None
    unit_id: Optional[UUID] = None
    event_type: str
    status_label: str = ""
    notes: str = ""
    event_payload: dict[str, Any] = Field(default_factory=dict)


class ServiceDispatchEventV2Create(ServiceDispatchEventV2Base):
    occurred_at: Optional[datetime] = None


class ServiceDispatchEventV2Out(ServiceDispatchEventV2Base):
    id: UUID
    company_id: UUID
    occurred_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True