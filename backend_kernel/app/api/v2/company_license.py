from pydantic import BaseModel
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime


class CompanyLicenseCreate(BaseModel):
    company_id: UUID
    plan_code: str
    status: str
    max_users: int
    max_units: int
    max_services_month: int
    grace_days: int
    features_json: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class CompanyLicenseUpdate(BaseModel):
    plan_code: Optional[str] = None
    status: Optional[str] = None
    max_users: Optional[int] = None
    max_units: Optional[int] = None
    max_services_month: Optional[int] = None
    grace_days: Optional[int] = None
    features_json: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class CompanyLicenseOut(BaseModel):
    id: UUID
    company_id: UUID
    plan_code: str
    status: str
    max_users: int
    max_units: int
    max_services_month: int
    grace_days: int
    features_json: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
