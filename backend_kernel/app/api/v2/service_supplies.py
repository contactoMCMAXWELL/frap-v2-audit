from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.company_supply import CompanySupply
from app.models.service_intake_v2 import ServiceIntakeV2
from app.models.service_supply_usage import ServiceSupplyUsage
from app.schemas.v2.service_supply_usage import (
    ServiceSupplyUsageCreate,
    ServiceSupplyUsageOut,
)
from app.services.license_guard import require_company_feature

router = APIRouter(prefix="/v2/service-supplies", tags=["v2-service-supplies"])


def _to_out(row: ServiceSupplyUsage, supply: CompanySupply | None) -> ServiceSupplyUsageOut:
    return ServiceSupplyUsageOut(
        id=row.id,
        company_id=row.company_id,
        intake_id=row.intake_id,
        supply_id=row.supply_id,
        supply_name=supply.name if supply else "",
        unit_label=supply.unit_label if supply else "",
        quantity=float(row.quantity or 0),
        unit_cost=float(row.unit_cost or 0),
        total_cost=float(row.total_cost or 0),
        lot_number=row.lot_number or "",
        notes=row.notes or "",
        created_at=row.created_at,
    )


@router.get("/{intake_id}", response_model=List[ServiceSupplyUsageOut])
def list_service_supplies(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "supplies")

    rows = (
        db.query(ServiceSupplyUsage)
        .filter(
            ServiceSupplyUsage.company_id == company_id,
            ServiceSupplyUsage.intake_id == intake_id,
        )
        .order_by(ServiceSupplyUsage.created_at.asc())
        .all()
    )

    supply_ids = [r.supply_id for r in rows]
    supply_map = {
        s.id: s
        for s in db.query(CompanySupply)
        .filter(
            CompanySupply.company_id == company_id,
            CompanySupply.id.in_(supply_ids) if supply_ids else False,
        )
        .all()
    } if supply_ids else {}

    return [_to_out(r, supply_map.get(r.supply_id)) for r in rows]


@router.post("/", response_model=ServiceSupplyUsageOut, status_code=201)
def create_service_supply(
    payload: ServiceSupplyUsageCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "supplies")

    intake = (
        db.query(ServiceIntakeV2)
        .filter(
            ServiceIntakeV2.id == payload.intake_id,
            ServiceIntakeV2.company_id == company_id,
        )
        .first()
    )
    if not intake:
        raise HTTPException(status_code=404, detail="Intake not found")

    supply = (
        db.query(CompanySupply)
        .filter(
            CompanySupply.id == payload.supply_id,
            CompanySupply.company_id == company_id,
        )
        .first()
    )
    if not supply:
        raise HTTPException(status_code=404, detail="Supply not found")

    quantity = float(payload.quantity or 0)
    unit_cost = (
        float(payload.unit_cost)
        if payload.unit_cost is not None
        else float(supply.default_unit_cost or 0)
    )
    total_cost = round(quantity * unit_cost, 2)

    row = ServiceSupplyUsage(
        company_id=company_id,
        intake_id=payload.intake_id,
        supply_id=payload.supply_id,
        quantity=quantity,
        unit_cost=unit_cost,
        total_cost=total_cost,
        lot_number=payload.lot_number or "",
        notes=payload.notes or "",
    )

    db.add(row)
    db.commit()
    db.refresh(row)

    return _to_out(row, supply)