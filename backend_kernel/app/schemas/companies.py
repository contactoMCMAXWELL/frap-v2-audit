from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class CompanyCreate(BaseModel):
    name: str
    code: str
    legal_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "Mexico"
    email: Optional[str] = None
    website: Optional[str] = None
    medical_director: Optional[str] = None
    license_number: Optional[str] = None
    rfc: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    logo_url: Optional[str] = None
    active: Optional[bool] = True


class CompanyPatch(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    legal_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    medical_director: Optional[str] = None
    license_number: Optional[str] = None
    rfc: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    logo_url: Optional[str] = None
    active: Optional[bool] = None


class CompanyOut(BaseModel):
    id: UUID
    name: str
    code: str
    legal_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    medical_director: Optional[str] = None
    license_number: Optional[str] = None
    rfc: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    logo_url: Optional[str] = None
    active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True