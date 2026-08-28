from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class FrapSignatureV2Upsert(BaseModel):
    intake_id: UUID
    signature_role: str

    signer_name: str = ""
    signer_role: str = ""
    signer_relation: str = ""

    image_base64: Optional[str] = None

    refused_to_sign: bool = False
    refusal_reason: str = ""

    device_id: Optional[str] = None
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    geo_accuracy_m: Optional[float] = None

    meta_json: dict = {}
    signed_at: Optional[datetime] = None


class FrapSignatureV2Out(BaseModel):
    id: UUID
    company_id: UUID
    intake_id: UUID
    captured_by_user_id: Optional[UUID]

    signature_role: str

    signer_name: str
    signer_role: str
    signer_relation: str

    image_base64: Optional[str]

    refused_to_sign: bool
    refusal_reason: str

    device_id: Optional[str]
    geo_lat: Optional[float]
    geo_lng: Optional[float]
    geo_accuracy_m: Optional[float]

    meta_json: dict
    signed_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FrapSignatureValidationOut(BaseModel):
    intake_id: UUID
    case_type: str
    is_ready_for_pdf: bool
    missing_signature_roles: list[str]
    inconsistency: Optional[str] = None
    requires_retrospective_approval: bool = False
    is_retrospective_approved: bool = False
    approval_missing: bool = False