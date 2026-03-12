from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class CompanyCreate(BaseModel):
    name: str
    code: str
    rfc: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    logo_url: Optional[str] = None

class CompanyPatch(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    rfc: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    logo_url: Optional[str] = None

class CompanyOut(BaseModel):
    id: UUID
    name: str
    code: str
    rfc: Optional[str]
    address: Optional[str]
    phone: Optional[str]
    logo_url: Optional[str]

    class Config:
        from_attributes = True
