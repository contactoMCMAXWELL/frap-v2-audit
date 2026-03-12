from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.models.company import Company
from app.models.user import User
from app.schemas.companies import CompanyCreate, CompanyOut
from app.schemas.users import UserCreate, UserOut
from app.services.folio import normalize_company_code
from app.services.security import hash_password
from app.services.authz import get_actor_admin, require_roles

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/companies", response_model=list[CompanyOut])
def admin_list_companies(actor=Depends(get_actor_admin), db: Session = Depends(get_db)):
    require_roles(actor, "SUPERADMIN")
    return db.query(Company).order_by(Company.created_at.desc()).all()


@router.post("/companies", response_model=CompanyOut, status_code=201)
def admin_create_company(payload: CompanyCreate, actor=Depends(get_actor_admin), db: Session = Depends(get_db)):
    require_roles(actor, "SUPERADMIN")

    code = normalize_company_code(payload.code or payload.name)
    if not code:
        raise HTTPException(status_code=400, detail="Company code required")
    if db.query(Company).filter(Company.code == code).first():
        raise HTTPException(status_code=409, detail="Company code already exists")

    c = Company(
        name=payload.name,
        code=code,
        rfc=getattr(payload, "rfc", "") or "",
        address=getattr(payload, "address", "") or "",
        phone=getattr(payload, "phone", "") or "",
        logo_url=getattr(payload, "logo_url", "") or "",
        active=True if getattr(payload, "active", None) is None else bool(getattr(payload, "active")),
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.get("/companies/{company_id}/users", response_model=list[UserOut])
def admin_list_company_users(company_id: UUID, actor=Depends(get_actor_admin), db: Session = Depends(get_db)):
    require_roles(actor, "SUPERADMIN")
    return db.query(User).filter(User.company_id == company_id).order_by(User.created_at.desc()).all()


@router.post("/companies/{company_id}/users", response_model=UserOut, status_code=201)
def admin_create_company_user(
    company_id: UUID,
    payload: UserCreate,
    actor=Depends(get_actor_admin),
    db: Session = Depends(get_db),
):
    require_roles(actor, "SUPERADMIN")

    if not db.query(Company).filter(Company.id == company_id).first():
        raise HTTPException(status_code=404, detail="Company not found")

    email = payload.email.strip().lower()

    # ÚNICO GLOBAL: email único en todo el sistema
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email already exists")

    # Seguridad: SUPERADMIN solo por SQL/manual
    if payload.role == "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Cannot create SUPERADMIN via API")

    u = User(
        company_id=company_id,
        email=email,
        name=payload.name or "",
        role=payload.role,
        active=bool(payload.active),
        password_hash=hash_password(payload.password),
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u
