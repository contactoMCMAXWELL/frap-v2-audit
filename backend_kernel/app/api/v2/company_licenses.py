from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user
from app.db.session import get_db
from app.models.company_license import CompanyLicense
from app.models.user import User
from app.schemas.v2.company_license import (
    CompanyLicenseCreate,
    CompanyLicenseOut,
    CompanyLicenseUpdate,
)
from app.services.company_license_service import CompanyLicenseService

router = APIRouter(
    prefix="/v2/company-licenses",
    tags=["company-licenses"],
)


def _require_superadmin(current_user: User) -> None:
    if str(getattr(current_user, "role", "") or "").upper() != "SUPERADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUPERADMIN required",
        )


@router.get("/current", response_model=CompanyLicenseOut)
def get_current_license(
    db: Session = Depends(get_db),
    company_id=Depends(get_company_id),
):
    license_row = CompanyLicenseService.ensure_license(db, company_id)
    return license_row


@router.post("/ensure-current", response_model=CompanyLicenseOut)
def ensure_license(
    db: Session = Depends(get_db),
    company_id=Depends(get_company_id),
):
    license_row = CompanyLicenseService.ensure_license(db, company_id)
    return license_row


@router.get("/summary/current")
def get_license_summary(
    db: Session = Depends(get_db),
    company_id=Depends(get_company_id),
):
    return CompanyLicenseService.get_license_summary(db, company_id)


@router.get("/", response_model=list[CompanyLicenseOut])
def list_licenses(
    db: Session = Depends(get_db),
    company_id=Depends(get_company_id),
):
    return (
        db.query(CompanyLicense)
        .filter(CompanyLicense.company_id == company_id)
        .order_by(CompanyLicense.created_at.desc())
        .all()
    )


@router.put("/current", response_model=CompanyLicenseOut)
def upsert_current_license(
    data: CompanyLicenseUpdate,
    db: Session = Depends(get_db),
    company_id=Depends(get_company_id),
    current_user: User = Depends(get_current_user),
):
    _require_superadmin(current_user)

    license_row = CompanyLicenseService.get_current_license(db, company_id)

    if not license_row:
        create_payload = {
            "company_id": company_id,
            "plan_code": data.plan_code or "TRIAL",
            "status": data.status or "trial",
            "starts_at": data.starts_at,
            "ends_at": data.ends_at,
            "max_users": data.max_users if data.max_users is not None else 5,
            "max_units": data.max_units if data.max_units is not None else 2,
            "max_services_month": (
                data.max_services_month if data.max_services_month is not None else 100
            ),
            "grace_days": data.grace_days if data.grace_days is not None else 7,
            "active": True if data.active is None else bool(data.active),
            "features_json": data.features_json or {},
            "notes": data.notes,
        }

        license_row = CompanyLicense(**create_payload)
        db.add(license_row)
        db.commit()
        db.refresh(license_row)
        return license_row

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(license_row, field, value)

    db.commit()
    db.refresh(license_row)
    return license_row


@router.post("/", response_model=CompanyLicenseOut)
def create_license(
    data: CompanyLicenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_superadmin(current_user)

    license_row = CompanyLicense(**data.model_dump())
    db.add(license_row)
    db.commit()
    db.refresh(license_row)
    return license_row


@router.patch("/{license_id}", response_model=CompanyLicenseOut)
def update_license(
    license_id: UUID,
    data: CompanyLicenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_superadmin(current_user)

    license_row = (
        db.query(CompanyLicense)
        .filter(CompanyLicense.id == license_id)
        .first()
    )

    if not license_row:
        raise HTTPException(status_code=404, detail="License not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(license_row, field, value)

    db.commit()
    db.refresh(license_row)
    return license_row