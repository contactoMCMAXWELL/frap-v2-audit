from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.company_supply import CompanySupply
from app.schemas.v2.company_supply import (
    CompanySupplyCreate,
    CompanySupplyOut,
    CompanySupplyUpdate,
)
from app.services.license_guard import require_company_feature

router = APIRouter(prefix="/v2/company-supplies", tags=["v2-company-supplies"])


@router.get("/", response_model=List[CompanySupplyOut])
def list_company_supplies(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "supplies")

    return (
        db.query(CompanySupply)
        .filter(CompanySupply.company_id == company_id)
        .order_by(CompanySupply.name.asc())
        .all()
    )


@router.post("/", response_model=CompanySupplyOut, status_code=201)
def create_company_supply(
    payload: CompanySupplyCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "supplies")

    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supply name is required",
        )

    row = CompanySupply(
        company_id=company_id,
        name=name,
        category=(payload.category or "general").strip() or "general",
        unit_label=(payload.unit_label or "pieza").strip() or "pieza",
        sku=(payload.sku or "").strip(),
        default_unit_cost=float(payload.default_unit_cost or 0),
        notes=(payload.notes or "").strip(),
        active=bool(payload.active),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{supply_id}", response_model=CompanySupplyOut)
def patch_company_supply(
    supply_id: uuid.UUID,
    payload: CompanySupplyUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "supplies")

    row = (
        db.query(CompanySupply)
        .filter(CompanySupply.id == supply_id, CompanySupply.company_id == company_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Supply not found")

    data = payload.model_dump(exclude_unset=True)

    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Supply name is required")
        row.name = name

    if "category" in data:
        row.category = (data["category"] or "general").strip() or "general"

    if "unit_label" in data:
        row.unit_label = (data["unit_label"] or "pieza").strip() or "pieza"

    if "sku" in data:
        row.sku = (data["sku"] or "").strip()

    if "default_unit_cost" in data and data["default_unit_cost"] is not None:
        row.default_unit_cost = float(data["default_unit_cost"])

    if "notes" in data:
        row.notes = (data["notes"] or "").strip()

    if "active" in data and data["active"] is not None:
        row.active = bool(data["active"])

    db.add(row)
    db.commit()
    db.refresh(row)
    return row