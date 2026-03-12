from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from uuid import UUID

from app.constants.roles import is_valid_role


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: str = "ADMIN"
    password: str
    active: bool = True

    @field_validator("role")
    @classmethod
    def _validate_role(cls, v: str):
        if not is_valid_role(v):
            raise ValueError(f"Invalid role '{v}'. Roles are fixed.")
        return v


class UserPatch(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    active: Optional[bool] = None

    @field_validator("role")
    @classmethod
    def _validate_role(cls, v: Optional[str]):
        if v is None:
            return v
        if not is_valid_role(v):
            raise ValueError(f"Invalid role '{v}'. Roles are fixed.")
        return v


class UserOut(BaseModel):
    id: UUID
    company_id: UUID
    name: Optional[str]
    email: EmailStr
    role: str
    active: bool

    class Config:
        from_attributes = True
