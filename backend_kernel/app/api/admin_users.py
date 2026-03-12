from __future__ import annotations

from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.services.auth import hash_password
from app.core.rbac import require_roles

router = APIRouter(prefix="/api/admin", tags=["admin"])

ALLOWED_ROLES = {"SUPERADMIN", "ADMIN", "DISPATCH", "PARAMEDIC"}


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)
    role: str = Field(min_length=3, max_length=30)
    company_id: Optional[str] = Field(
        default=None,
        description="Required for SUPERADMIN; ignored for ADMIN (forced to token company).",
    )
    name: Optional[str] = Field(default=None, max_length=80)
    active: bool = True


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    company_id: str
    name: Optional[str] = None
    active: bool = True


def _normalize_role(r: str) -> str:
    return (r or "").strip().upper()


def _as_out(u: User) -> UserOut:
    return UserOut(
        id=str(getattr(u, "id")),
        email=str(getattr(u, "email")),
        role=str(getattr(u, "role")),
        company_id=str(getattr(u, "company_id")),
        name=getattr(u, "name", None),
        active=bool(getattr(u, "active", True)),
    )


@router.post(
    "/users",
    status_code=status.HTTP_201_CREATED,
    response_model=UserOut,
    dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))],
)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    token_claims: dict = Depends(require_roles("SUPERADMIN", "ADMIN")),
):
    caller_role = str(token_claims.get("role", "")).upper()
    caller_company_id = str(token_claims.get("company_id", ""))

    role = _normalize_role(payload.role)
    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid role. Allowed: {sorted(ALLOWED_ROLES)}",
        )

    # Company resolution rules
    if caller_role == "SUPERADMIN":
        if not payload.company_id:
            raise HTTPException(
                status_code=422,
                detail="company_id is required for SUPERADMIN when creating users",
            )
        target_company_id = payload.company_id
    else:
        # ADMIN scope: force company_id to caller company
        target_company_id = caller_company_id

        if payload.company_id and payload.company_id != caller_company_id:
            raise HTTPException(
                status_code=403,
                detail="ADMIN cannot create users in another company",
            )

        # Prevent ADMIN from creating SUPERADMIN
        if role == "SUPERADMIN":
            raise HTTPException(
                status_code=403,
                detail="Only SUPERADMIN can create SUPERADMIN users",
            )

    # Unique email check
    existing = db.query(User).filter(User.email == str(payload.email)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    u = User()

    # If id is not auto-generated, try to set it
    try:
        if getattr(u, "id", None) in (None, ""):
            setattr(u, "id", uuid4())
    except Exception:
        pass

    setattr(u, "email", str(payload.email))
    setattr(u, "password_hash", hash_password(payload.password))
    setattr(u, "role", role)
    setattr(u, "company_id", target_company_id)

    if hasattr(u, "name"):
        setattr(u, "name", payload.name)

    if hasattr(u, "active"):
        setattr(u, "active", bool(payload.active))

    db.add(u)
    db.commit()
    db.refresh(u)

    return _as_out(u)


@router.get(
    "/users",
    dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))],
)
def list_users(
    company_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    token_claims: dict = Depends(require_roles("SUPERADMIN", "ADMIN")),
):
    caller_role = str(token_claims.get("role", "")).upper()
    caller_company_id = str(token_claims.get("company_id", ""))

    if caller_role == "SUPERADMIN":
        target_company_id = company_id
    else:
        if company_id and company_id != caller_company_id:
            raise HTTPException(
                status_code=403,
                detail="ADMIN cannot list users from another company",
            )
        target_company_id = caller_company_id

    q = db.query(User)
    if target_company_id:
        q = q.filter(User.company_id == target_company_id)

    rows: List[User] = q.order_by(User.email.asc()).all()
    out = [_as_out(u).model_dump() for u in rows]

    return {"value": out, "Count": len(out)}


@router.patch(
    "/users/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))],
)
def patch_user(
    user_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    token_claims: dict = Depends(require_roles("SUPERADMIN", "ADMIN")),
):
    caller_role = str(token_claims.get("role", "")).upper()
    caller_company_id = str(token_claims.get("company_id", ""))

    u: User | None = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if caller_role != "SUPERADMIN":
        if str(getattr(u, "company_id", "")) != caller_company_id:
            raise HTTPException(
                status_code=403,
                detail="ADMIN cannot modify users from another company",
            )

    if "role" in payload:
        new_role = _normalize_role(str(payload["role"]))
        if new_role not in ALLOWED_ROLES:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid role. Allowed: {sorted(ALLOWED_ROLES)}",
            )
        if caller_role != "SUPERADMIN" and new_role == "SUPERADMIN":
            raise HTTPException(
                status_code=403,
                detail="Only SUPERADMIN can assign SUPERADMIN role",
            )
        setattr(u, "role", new_role)

    if "active" in payload and hasattr(u, "active"):
        setattr(u, "active", bool(payload["active"]))

    if "name" in payload and hasattr(u, "name"):
        setattr(u, "name", payload["name"])

    if "password" in payload:
        pw = str(payload["password"])
        if len(pw) < 6:
            raise HTTPException(
                status_code=422,
                detail="password must be at least 6 characters",
            )
        setattr(u, "password_hash", hash_password(pw))

    db.add(u)
    db.commit()
    db.refresh(u)

    return _as_out(u)