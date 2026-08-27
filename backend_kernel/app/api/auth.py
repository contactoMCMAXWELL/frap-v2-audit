from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.services.auth import verify_password
from app.core.security import create_access_token

router = APIRouter()


class LoginIn(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    company_id: str
    name: str | None = None


@router.post("/login", response_model=LoginOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    # Username is email in your system
    u = db.query(User).filter(User.email == payload.username).first()
    if not u:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    stored = getattr(u, "password_hash", "") or ""
    if not verify_password(payload.password, stored):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(
        {
            "sub": str(u.id),
            "role": str(getattr(u, "role", "")),
            "company_id": str(getattr(u, "company_id", "")),
            "email": str(getattr(u, "email", "")),
        },
        expires_in_seconds=60 * 60 * 24,
    )

    return LoginOut(
        access_token=token,
        user_id=str(u.id),
        role=str(getattr(u, "role", "")),
        company_id=str(getattr(u, "company_id", "")),
        name=getattr(u, "name", None),
    )