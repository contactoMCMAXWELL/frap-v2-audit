# app/schemas/auth.py
from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

    # Compatibilidad (frontend viejo): se ignora en backend
    company_id: Optional[UUID] = None


class LoginResponse(BaseModel):
    user_id: UUID
    company_id: UUID
    role: str
    name: Optional[str] = None
    email: EmailStr
