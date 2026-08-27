from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.company import Company
from app.models.user import User
from app.schemas.companies import CompanyCreate, CompanyOut, CompanyPatch

router = APIRouter(prefix="/admin/companies", tags=["admin-companies"])


def _require_superadmin(current_user: User) -> None:
    if str(current_user.role).upper() != "SUPERADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUPERADMIN required",
        )


def _clean_text(value: Optional[str], *, default: str = "") -> str:
    if value is None:
        return default
    return str(value).strip()


@router.get("", response_model=list[CompanyOut])
def list_admin_companies(
    q: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_superadmin(current_user)

    query = db.query(Company)

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (Company.name.ilike(like))
            | (Company.code.ilike(like))
            | (Company.rfc.ilike(like))
            | (Company.legal_name.ilike(like))
            | (Company.email.ilike(like))
        )

    return query.order_by(Company.created_at.desc()).all()


@router.post("", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
def create_admin_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_superadmin(current_user)

    name = _clean_text(payload.name)
    code = _clean_text(payload.code)

    if not name:
        raise HTTPException(status_code=400, detail="Company name is required")
    if not code:
        raise HTTPException(status_code=400, detail="Company code is required")

    exists = db.query(Company).filter(Company.code == code).first()
    if exists:
        raise HTTPException(status_code=400, detail="Company code already exists")

    company = Company(
        id=uuid.uuid4(),
        name=name,
        code=code,
        legal_name=_clean_text(payload.legal_name),
        city=_clean_text(payload.city),
        state=_clean_text(payload.state),
        country=_clean_text(payload.country, default="Mexico") or "Mexico",
        email=_clean_text(payload.email),
        website=_clean_text(payload.website),
        medical_director=_clean_text(payload.medical_director),
        license_number=_clean_text(payload.license_number),
        rfc=_clean_text(payload.rfc),
        address=_clean_text(payload.address),
        phone=_clean_text(payload.phone),
        logo_url=_clean_text(payload.logo_url),
        active=True if payload.active is None else bool(payload.active),
    )

    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/{company_id}", response_model=CompanyOut)
def get_admin_company(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_superadmin(current_user)

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Not Found")
    return company


@router.patch("/{company_id}", response_model=CompanyOut)
def patch_admin_company(
    company_id: uuid.UUID,
    payload: CompanyPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_superadmin(current_user)

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Not Found")

    data = payload.model_dump(exclude_unset=True)

    if "code" in data:
        new_code = _clean_text(data["code"])
        if not new_code:
            raise HTTPException(status_code=400, detail="Company code is required")

        exists = (
            db.query(Company)
            .filter(Company.code == new_code, Company.id != company_id)
            .first()
        )
        if exists:
            raise HTTPException(status_code=400, detail="Company code already exists")
        company.code = new_code

    if "name" in data:
        new_name = _clean_text(data["name"])
        if not new_name:
            raise HTTPException(status_code=400, detail="Company name is required")
        company.name = new_name

    text_fields = [
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
            cleaned = _clean_text(data[field])
            if field == "country" and not cleaned:
                cleaned = "Mexico"
            setattr(company, field, cleaned)

    if "active" in data:
        company.active = bool(data["active"])

    db.add(company)
    db.commit()
    db.refresh(company)
    return company