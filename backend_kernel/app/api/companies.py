from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.models.company import Company
from app.schemas.companies import CompanyCreate, CompanyPatch, CompanyOut

from app.services.folio import normalize_company_code
from app.services.authz import get_actor_admin, require_roles

router = APIRouter(prefix="/companies", tags=["companies"])


@router.post("", response_model=CompanyOut, status_code=201)
def create_company(
    payload: CompanyCreate,
    actor=Depends(get_actor_admin),
    db: Session = Depends(get_db),
):
    require_roles(actor, "SUPERADMIN")

    code = normalize_company_code(payload.code or payload.name)
    if not code:
        raise HTTPException(status_code=400, detail="Company code required")

    exists = db.query(Company).filter(Company.code == code).first()
    if exists:
        raise HTTPException(status_code=409, detail="Company code already exists")
    row = Company(
        name=payload.name,
        code=code,
        rfc=payload.rfc or "",
        address=payload.address or "",
        phone=payload.phone or "",
        logo_url=payload.logo_url or "",
        active=True if payload.active is None else bool(payload.active),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/{company_id}", response_model=CompanyOut)
def get_company(
    company_id: UUID,
    actor=Depends(get_actor_admin),
    db: Session = Depends(get_db),
):
    require_roles(actor, "SUPERADMIN")
    row = db.query(Company).filter(Company.id == company_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Company not found")
    return row


@router.patch("/{company_id}", response_model=CompanyOut)
def patch_company(
    company_id: UUID,
    payload: CompanyPatch,
    actor=Depends(get_actor_admin),
    db: Session = Depends(get_db),
):
    require_roles(actor, "SUPERADMIN")
    row = db.query(Company).filter(Company.id == company_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Company not found")
    if payload.code and payload.code != row.code:
        new_code = normalize_company_code(payload.code)
        exists = db.query(Company).filter(Company.code == new_code).first()
        if exists:
            raise HTTPException(status_code=409, detail="Company code already exists")
        row.code = new_code
    for k in ["name", "rfc", "address", "phone", "logo_url", "active"]:
        v = getattr(payload, k)
        if v is not None:
            setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.get("", response_model=list[CompanyOut])
def list_companies(
    actor=Depends(get_actor_admin),
    db: Session = Depends(get_db),
):
    require_roles(actor, "SUPERADMIN")
    return db.query(Company).order_by(Company.created_at.desc()).all()
