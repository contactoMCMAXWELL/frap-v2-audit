from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel


class CompanyLicenseCreate(BaseModel):
    company_id: UUID
    plan_code: str
    status: str
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    max_users: int
    max_units: int
    max_services_month: int
    grace_days: int
    active: Optional[bool] = True
    features_json: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class CompanyLicenseUpdate(BaseModel):
    plan_code: Optional[str] = None
    status: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    max_users: Optional[int] = None
    max_units: Optional[int] = None
    max_services_month: Optional[int] = None
    grace_days: Optional[int] = None
    active: Optional[bool] = None
    features_json: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class CompanyLicenseOut(BaseModel):
    id: UUID
    company_id: UUID
    plan_code: str
    status: str
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    max_users: int
    max_units: int
    max_services_month: int
    grace_days: int
    active: bool
    features_json: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True