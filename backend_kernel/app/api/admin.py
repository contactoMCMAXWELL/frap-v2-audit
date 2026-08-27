from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.models.company import Company
from app.models.user import User
from app.schemas.companies import CompanyCreate, CompanyPatch, CompanyOut
from app.schemas.users import UserCreate, UserOut
from app.services.folio import normalize_company_code
from app.services.security import hash_password
from app.services.authz import get_actor_admin, require_roles
from app.services.company_license_service import CompanyLicenseService

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
        name=payload.name or "",
        code=code,
        legal_name=payload.legal_name or "",
        city=payload.city or "",
        state=payload.state or "",
        country=payload.country or "Mexico",
        email=payload.email or "",
        website=payload.website or "",
        medical_director=payload.medical_director or "",
        license_number=payload.license_number or "",
        rfc=payload.rfc or "",
        address=payload.address or "",
        phone=payload.phone or "",
        logo_url=payload.logo_url or "",
        active=True if payload.active is None else bool(payload.active),
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.get("/companies/{company_id}", response_model=CompanyOut)
def admin_get_company(company_id: UUID, actor=Depends(get_actor_admin), db: Session = Depends(get_db)):
    require_roles(actor, "SUPERADMIN")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Not Found")
    return company


@router.patch("/companies/{company_id}", response_model=CompanyOut)
def admin_patch_company(
    company_id: UUID,
    payload: CompanyPatch,
    actor=Depends(get_actor_admin),
    db: Session = Depends(get_db),
):
    require_roles(actor, "SUPERADMIN")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Not Found")

    data = payload.model_dump(exclude_unset=True)

    if "code" in data:
        new_code = normalize_company_code(data.get("code") or company.name)
        if not new_code:
            raise HTTPException(status_code=400, detail="Company code required")
        exists = (
            db.query(Company)
            .filter(Company.code == new_code, Company.id != company_id)
            .first()
        )
        if exists:
            raise HTTPException(status_code=409, detail="Company code already exists")
        company.code = new_code

    text_fields = [
        "name",
        "legal_name",
        "city",
        "state",
        "country",
        "email",
        "website",
        "medical_director",
        "license_number",
        "rfc",
        "address",
        "phone",
        "logo_url",
    ]

    for field in text_fields:
        if field in data:
            setattr(company, field, data[field] or "")

    if "active" in data and data["active"] is not None:
        company.active = bool(data["active"])

    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/companies/{company_id}/users", response_model=list[UserOut])
def admin_list_company_users(company_id: UUID, actor=Depends(get_actor_admin), db: Session = Depends(get_db)):
    require_roles(actor, "SUPERADMIN")
    return db.query(User).filter(User.company_id == company_id).order_by(User.created_at.desc()).all()


@router.post("/companies/{company_id}/users", response_model=UserOut)
def create_company_user(
    company_id: UUID,
    payload: UserCreate,
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="email already exists")

    license_row = CompanyLicenseService.ensure_license(db, company_id)
    usage = CompanyLicenseService.get_usage_summary(db, company_id)

    max_users = int(getattr(license_row, "max_users", 0) or 0)
    users_count = int(usage.get("users_count", 0) or 0)

    user_active = bool(getattr(payload, "active", True))
    if user_active and max_users > 0 and users_count >= max_users:
        raise HTTPException(
            status_code=403,
            detail=f"User limit reached for company license ({users_count}/{max_users})",
        )

    obj = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        company_id=company_id,
        active=user_active,
    )

    if hasattr(payload, "name") and hasattr(obj, "name"):
        obj.name = payload.name

    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj