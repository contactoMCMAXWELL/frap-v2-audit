from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class CompanyCreate(BaseModel):
    name: str
    # ÚNICO GLOBAL y estable
    code: Optional[str] = None

    # opcionales (nivel empresarial)
    rfc: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    logo_url: Optional[str] = None
    active: Optional[bool] = True


class CompanyOut(BaseModel):
    id: UUID
    name: str
    code: str
    rfc: str
    address: str
    phone: str
    logo_url: str
    active: bool

    class Config:
        from_attributes = True
