from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.medication_catalog import MedicationCatalog
from app.schemas.v2.medication_catalog import (
    MedicationCatalogCreate,
    MedicationCatalogOut,
    MedicationCatalogPatch,
)

router = APIRouter(prefix="/v2/medication-catalog", tags=["v2-medication-catalog"])


@router.get("/", response_model=List[MedicationCatalogOut])
def list_medications(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    return (
        db.query(MedicationCatalog)
        .filter(MedicationCatalog.company_id == company_id)
        .order_by(MedicationCatalog.name.asc())
        .all()
    )


@router.post("/", response_model=MedicationCatalogOut, status_code=201)
def create_medication(
    payload: MedicationCatalogCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Medication name is required",
        )

    row = MedicationCatalog(
        company_id=company_id,
        name=name,
        presentation=(payload.presentation or "").strip(),
        concentration=(payload.concentration or "").strip(),
        route=(payload.route or "").strip(),
        default_dose=(payload.default_dose or "").strip(),
        notes=(payload.notes or "").strip(),
        active=bool(payload.active),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{medication_id}", response_model=MedicationCatalogOut)
def patch_medication(
    medication_id: uuid.UUID,
    payload: MedicationCatalogPatch,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    row = (
        db.query(MedicationCatalog)
        .filter(
            MedicationCatalog.id == medication_id,
            MedicationCatalog.company_id == company_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Medication not found")

    data = payload.model_dump(exclude_unset=True)

    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Medication name is required")
        row.name = name

    if "presentation" in data:
        row.presentation = (data["presentation"] or "").strip()

    if "concentration" in data:
        row.concentration = (data["concentration"] or "").strip()

    if "route" in data:
        row.route = (data["route"] or "").strip()

    if "default_dose" in data:
        row.default_dose = (data["default_dose"] or "").strip()

    if "notes" in data:
        row.notes = (data["notes"] or "").strip()

    if "active" in data and data["active"] is not None:
        row.active = bool(data["active"])

    db.add(row)
    db.commit()
    db.refresh(row)
    return row