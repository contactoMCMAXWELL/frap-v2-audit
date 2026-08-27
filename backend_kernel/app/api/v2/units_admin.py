from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.unit import Unit
from app.schemas.v2.unit import UnitCreate, UnitOut, UnitPatch
from app.services.company_license_service import CompanyLicenseService

router = APIRouter(prefix="/v2/units-admin", tags=["v2-units-admin"])


def _active_units_count(db: Session, company_id: uuid.UUID) -> int:
    return (
        db.query(Unit)
        .filter(Unit.company_id == company_id, Unit.active.is_(True))
        .count()
    )


def _enforce_unit_limit(db: Session, company_id: uuid.UUID) -> None:
    license_row = CompanyLicenseService.ensure_license(db, company_id)
    max_units = int(getattr(license_row, "max_units", 0) or 0)
    current_units = _active_units_count(db, company_id)

    if max_units > 0 and current_units >= max_units:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unit limit reached for company license ({current_units}/{max_units})",
        )


@router.get("/", response_model=List[UnitOut])
def list_units(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    return (
        db.query(Unit)
        .filter(Unit.company_id == company_id)
        .order_by(Unit.code.asc())
        .all()
    )


@router.post("/", response_model=UnitOut, status_code=201)
def create_unit(
    payload: UnitCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    code = (payload.unit_code or "").strip()
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit code is required",
        )

    exists = (
        db.query(Unit)
        .filter(Unit.company_id == company_id, Unit.code == code)
        .first()
    )
    if exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unit code already exists",
        )

    is_active = bool(payload.active)
    if is_active:
        _enforce_unit_limit(db, company_id)

    row = Unit(
        company_id=company_id,
        code=code,
        type=(payload.type or "").strip() or None,
        plate=(payload.plate or "").strip() or None,
        active=is_active,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{unit_id}", response_model=UnitOut)
def patch_unit(
    unit_id: uuid.UUID,
    payload: UnitPatch,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    row = (
        db.query(Unit)
        .filter(Unit.id == unit_id, Unit.company_id == company_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Unit not found")

    data = payload.model_dump(exclude_unset=True)

    if "unit_code" in data:
        code = (data["unit_code"] or "").strip()
        if not code:
            raise HTTPException(status_code=400, detail="Unit code is required")

        exists = (
            db.query(Unit)
            .filter(
                Unit.company_id == company_id,
                Unit.code == code,
                Unit.id != unit_id,
            )
            .first()
        )
        if exists:
            raise HTTPException(status_code=409, detail="Unit code already exists")

        row.code = code

    if "type" in data:
        row.type = (data["type"] or "").strip() or None

    if "plate" in data:
        row.plate = (data["plate"] or "").strip() or None

    if "active" in data and data["active"] is not None:
        new_active = bool(data["active"])
        current_active = bool(row.active)

        if new_active and not current_active:
            _enforce_unit_limit(db, company_id)

        row.active = new_active

    db.add(row)
    db.commit()
    db.refresh(row)
    return row