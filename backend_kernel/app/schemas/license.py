from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class LicenseCreate(BaseModel):
    company_id: UUID
    plan_code: str
    plan_name: str
    starts_at: datetime
    expires_at: datetime


class LicenseOut(BaseModel):
    id: UUID
    company_id: UUID
    plan_code: str
    plan_name: str
    status: str
    starts_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True