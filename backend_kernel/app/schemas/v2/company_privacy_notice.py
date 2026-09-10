from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CompanyPrivacyNoticeCreate(BaseModel):
    version: str = Field(min_length=1, max_length=40)
    title: str = Field(default="Aviso de Privacidad", min_length=1, max_length=180)
    content: str = Field(default="", max_length=50000)
    responsible_name: str = Field(default="", max_length=180)
    responsible_address: str = Field(default="", max_length=500)
    privacy_email: Optional[str] = Field(default=None, max_length=180)
    arco_email: Optional[str] = Field(default=None, max_length=180)
    effective_from: Optional[datetime] = None


class CompanyPrivacyNoticePatch(BaseModel):
    version: Optional[str] = Field(default=None, min_length=1, max_length=40)
    title: Optional[str] = Field(default=None, min_length=1, max_length=180)
    content: Optional[str] = Field(default=None, max_length=50000)
    responsible_name: Optional[str] = Field(default=None, max_length=180)
    responsible_address: Optional[str] = Field(default=None, max_length=500)
    privacy_email: Optional[str] = Field(default=None, max_length=180)
    arco_email: Optional[str] = Field(default=None, max_length=180)
    effective_from: Optional[datetime] = None


class CompanyPrivacyNoticeOut(BaseModel):
    id: UUID
    company_id: UUID
    version: str
    status: str
    title: str
    content: str
    responsible_name: str
    responsible_address: str
    privacy_email: Optional[str] = None
    arco_email: Optional[str] = None
    effective_from: Optional[datetime] = None
    published_at: Optional[datetime] = None
    published_by_user_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PublicPrivacyNoticeOut(BaseModel):
    version: str
    title: str
    content: str
    responsible_name: str
    responsible_address: str
    privacy_email: Optional[str] = None
    arco_email: Optional[str] = None
    effective_from: Optional[datetime] = None
    published_at: datetime
