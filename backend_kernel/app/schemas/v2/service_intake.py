from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ServiceIntakeV2Base(BaseModel):
    service_id: Optional[UUID] = None
    incident_number: str = ""
    service_type: str
    service_subtype: str = ""

    priority_operational: int = 1
    priority_clinical: str = "routine"

    call_source: str = ""
    caller_name: str = ""
    caller_phone: str = ""

    location_text: str
    location_reference: str = ""
    lat: Optional[str] = None
    lng: Optional[str] = None

    patient_count_estimated: int = 1
    scene_risk: str = "unknown"
    destination_suggested: str = ""
    payer_type: str = "private"

    notes: str = ""
    extra_json: dict[str, Any] = Field(default_factory=dict)
    active: bool = True


class ServiceIntakeV2Create(ServiceIntakeV2Base):
    capture_mode: str = "realtime"
    occurred_at: Optional[datetime] = None
    retrospective_reason: Optional[str] = None


class ServiceIntakeV2Update(BaseModel):
    capture_mode: Optional[str] = None
    occurred_at: Optional[datetime] = None
    retrospective_reason: Optional[str] = None

    incident_number: Optional[str] = None
    service_type: Optional[str] = None
    service_subtype: Optional[str] = None
    priority_operational: Optional[int] = None
    priority_clinical: Optional[str] = None
    call_source: Optional[str] = None
    caller_name: Optional[str] = None
    caller_phone: Optional[str] = None
    location_text: Optional[str] = None
    location_reference: Optional[str] = None
    lat: Optional[str] = None
    lng: Optional[str] = None
    patient_count_estimated: Optional[int] = None
    scene_risk: Optional[str] = None
    destination_suggested: Optional[str] = None
    payer_type: Optional[str] = None
    notes: Optional[str] = None
    extra_json: Optional[dict[str, Any]] = None
    active: Optional[bool] = None


class ServiceIntakeV2Out(ServiceIntakeV2Base):
    id: UUID
    company_id: UUID

    capture_mode: str
    occurred_at: Optional[datetime] = None
    retrospective_reason: Optional[str] = None
    retrospective_started_by_user_id: Optional[UUID] = None
    retrospective_started_at: Optional[datetime] = None
    approved_by_user_id: Optional[UUID] = None
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True