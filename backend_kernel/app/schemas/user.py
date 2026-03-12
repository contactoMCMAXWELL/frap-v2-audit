from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class UserCreate(BaseModel):
    email: str
    role: str
    password_hash: Optional[str] = None


class UserPatch(BaseModel):
    role: Optional[str] = None
    password_hash: Optional[str] = None


class UserOut(BaseModel):
    id: UUID
    company_id: UUID
    email: str
    role: str

    class Config:
        from_attributes = True
