from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.hospital_catalog import HospitalCatalog
from app.schemas.v2.hospital_catalog import (
    HospitalCatalogCreate,
    HospitalCatalogOut,
    HospitalCatalogPatch,
)

router = APIRouter(prefix="/v2/hospital-catalog", tags=["v2-hospital-catalog"])


@router.get("/", response_model=List[HospitalCatalogOut])
def list_hospitals(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    return (
        db.query(HospitalCatalog)
        .filter(HospitalCatalog.company_id == company_id)
        .order_by(HospitalCatalog.name.asc())
        .all()
    )


@router.post("/", response_model=HospitalCatalogOut, status_code=201)
def create_hospital(
    payload: HospitalCatalogCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hospital name is required",
        )

    row = HospitalCatalog(
        company_id=company_id,
        name=name,
        level=(payload.level or "").strip(),
        address=(payload.address or "").strip(),
        phone=(payload.phone or "").strip(),
        trauma_center=bool(payload.trauma_center),
        notes=(payload.notes or "").strip(),
        active=bool(payload.active),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{hospital_id}", response_model=HospitalCatalogOut)
def patch_hospital(
    hospital_id: uuid.UUID,
    payload: HospitalCatalogPatch,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    row = (
        db.query(HospitalCatalog)
        .filter(HospitalCatalog.id == hospital_id, HospitalCatalog.company_id == company_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Hospital not found")

    data = payload.model_dump(exclude_unset=True)

    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Hospital name is required")
        row.name = name

    if "level" in data:
        row.level = (data["level"] or "").strip()

    if "address" in data:
        row.address = (data["address"] or "").strip()

    if "phone" in data:
        row.phone = (data["phone"] or "").strip()

    if "notes" in data:
        row.notes = (data["notes"] or "").strip()

    if "trauma_center" in data and data["trauma_center"] is not None:
        row.trauma_center = bool(data["trauma_center"])

    if "active" in data and data["active"] is not None:
        row.active = bool(data["active"])

    db.add(row)
    db.commit()
    db.refresh(row)
    return row