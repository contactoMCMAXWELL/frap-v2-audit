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

class PublicEmergencyContactInput(BaseModel):
    contact_order: int = Field(default=1, ge=1, le=2)
    name: str = Field(min_length=1, max_length=180)
    relationship: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=1, max_length=40)
    present_at_event: bool = False


class PublicMedicalProfileInput(BaseModel):
    blood_type: Optional[str] = Field(default=None, max_length=10)
    allergies_json: list[Any] = Field(default_factory=list)
    allergies_detail: Optional[str] = None
    conditions_json: list[Any] = Field(default_factory=list)
    conditions_detail: Optional[str] = None
    medications_json: list[Any] = Field(default_factory=list)
    uses_anticoagulants: Optional[bool] = None
    surgeries_json: list[Any] = Field(default_factory=list)
    recent_injury_detail: Optional[str] = None
    implants_json: list[Any] = Field(default_factory=list)
    medical_service_type: Optional[str] = Field(default=None, max_length=60)
    insurer_name: Optional[str] = Field(default=None, max_length=180)
    policy_number: Optional[str] = Field(default=None, max_length=100)
    affiliation_number: Optional[str] = Field(default=None, max_length=100)
    transfer_preference: Optional[str] = Field(default=None, max_length=80)
    preferred_hospital: Optional[str] = Field(default=None, max_length=180)
    emergency_notes: Optional[str] = Field(default=None, max_length=300)
    suit_cut_authorized: Optional[bool] = None
    protective_equipment_json: list[Any] = Field(default_factory=list)


class PublicParticipantComplete(BaseModel):
    participant_number: Optional[str] = Field(default=None, max_length=50)
    first_name: str = Field(min_length=1, max_length=100)
    paternal_surname: str = Field(min_length=1, max_length=100)
    maternal_surname: Optional[str] = Field(default=None, max_length=100)
    birth_date: Optional[date] = None
    phone: Optional[str] = Field(default=None, max_length=40)
    email: Optional[str] = Field(default=None, max_length=180)
    state_origin: Optional[str] = Field(default=None, max_length=100)
    city_origin: Optional[str] = Field(default=None, max_length=120)
    category: Optional[str] = Field(default=None, max_length=100)
    team_name: Optional[str] = Field(default=None, max_length=120)
    vehicle_type: Optional[str] = Field(default=None, max_length=60)
    vehicle_number: Optional[str] = Field(default=None, max_length=50)
    vehicle_make_model: Optional[str] = Field(default=None, max_length=150)
    vehicle_color: Optional[str] = Field(default=None, max_length=60)
    vehicle_plates: Optional[str] = Field(default=None, max_length=30)

    emergency_contacts: list[PublicEmergencyContactInput] = Field(min_length=1, max_length=2)
    medical_profile: PublicMedicalProfileInput

    privacy_notice_accepted: bool
    sensitive_data_authorized: bool
    information_confirmed: bool


class PublicParticipantSelfOut(BaseModel):
    participant_id: UUID
    participant_token: str
    status: str
    profile_completed_at: Optional[datetime] = None

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
    vehicle_make_model: Optional[str] = None
    vehicle_color: Optional[str] = None
    vehicle_plates: Optional[str] = None

    emergency_contacts: list[PublicEmergencyContactInput] = Field(default_factory=list)
    medical_profile: Optional[PublicMedicalProfileInput] = None

    privacy_notice_version: Optional[str] = None
    privacy_notice_accepted: bool = False
    sensitive_data_authorized: bool = False
    information_confirmed: bool = False


class ParticipantCompletedOut(BaseModel):
    participant_id: UUID
    participant_token: str
    status: str
    profile_completed_at: datetime
