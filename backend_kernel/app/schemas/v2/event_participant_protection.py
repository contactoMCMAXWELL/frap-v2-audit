from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class EventProtectionUpsert(BaseModel):
    enabled: bool = True
    registration_open: bool = True
    event_type: str = "otro"
    public_event_name: str = ""
    organizer_name: str = ""
    registration_deadline: Optional[datetime] = None
    organizer_logo_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    organizer_message: Optional[str] = Field(default=None, max_length=250)
    gallery_json: list[Any] = Field(default_factory=list)
    privacy_notice_version: str = "1.0"
    extra_json: dict[str, Any] = Field(default_factory=dict)


class EventProtectionOut(EventProtectionUpsert):
    id: UUID
    company_id: UUID
    intake_id: UUID
    public_token: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PublicEventProtectionOut(BaseModel):
    public_token: str
    event_type: str
    public_event_name: str
    organizer_name: str
    registration_open: bool
    registration_deadline: Optional[datetime] = None
    organizer_logo_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    organizer_message: Optional[str] = None
    gallery_json: list[Any] = Field(default_factory=list)
    privacy_notice_version: str
    event_starts_at: Optional[datetime] = None
    event_ends_at: Optional[datetime] = None
    event_location: Optional[str] = None
    ambulance_company_name: Optional[str] = None


class PublicParticipantCreate(BaseModel):
    participant_number: Optional[str] = None
    first_name: str
    paternal_surname: str
    maternal_surname: Optional[str] = None
    birth_date: Optional[date] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    state_origin: Optional[str] = None
    city_origin: Optional[str] = None
    category: Optional[str] = None
    team_name: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None


class ParticipantPrivateOut(PublicParticipantCreate):
    id: UUID
    protection_id: UUID
    participant_token: str
    status: str
    source: str
    preloaded: bool
    profile_completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ParticipantCreatedOut(BaseModel):
    participant_id: UUID
    participant_token: str
    status: str
