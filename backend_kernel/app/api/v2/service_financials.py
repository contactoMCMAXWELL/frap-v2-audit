from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.service_financial_v2 import ServiceFinancialV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.models.service_supply_usage import ServiceSupplyUsage
from app.schemas.v2.service_financial import (
    ServiceFinancialV2Out,
    ServiceFinancialV2Upsert,
)
from app.services.license_guard import require_company_feature

router = APIRouter(prefix="/v2/service-financials", tags=["v2-service-financials"])


@router.get("/{intake_id}", response_model=ServiceFinancialV2Out)
def get_service_financial(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "financials")

    row = (
        db.query(ServiceFinancialV2)
        .filter(
            ServiceFinancialV2.company_id == company_id,
            ServiceFinancialV2.intake_id == intake_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Financial record not found")

    return row


@router.put("/", response_model=ServiceFinancialV2Out)
def upsert_service_financial(
    payload: ServiceFinancialV2Upsert,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "financials")

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

    supplies_cost = (
        db.query(func.coalesce(func.sum(ServiceSupplyUsage.total_cost), 0))
        .filter(
            ServiceSupplyUsage.company_id == company_id,
            ServiceSupplyUsage.intake_id == payload.intake_id,
        )
        .scalar()
    )
    supplies_cost = float(supplies_cost or 0)

    crew_cost = float(payload.crew_cost or 0)
    unit_cost = float(payload.unit_cost or 0)
    fuel_cost = float(payload.fuel_cost or 0)
    other_cost = float(payload.other_cost or 0)
    sale_price = float(payload.sale_price or 0)

    total_cost = round(
        crew_cost + unit_cost + fuel_cost + supplies_cost + other_cost,
        2,
    )
    sale_price = round(sale_price, 2)
    margin_amount = round(sale_price - total_cost, 2)
    margin_percent = round((margin_amount / sale_price) * 100, 2) if sale_price > 0 else 0

    row = (
        db.query(ServiceFinancialV2)
        .filter(
            ServiceFinancialV2.company_id == company_id,
            ServiceFinancialV2.intake_id == payload.intake_id,
        )
        .first()
    )

    data = payload.model_dump(exclude_unset=True)
    data.pop("intake_id", None)

    data["crew_cost"] = crew_cost
    data["unit_cost"] = unit_cost
    data["fuel_cost"] = fuel_cost
    data["supplies_cost"] = supplies_cost
    data["other_cost"] = other_cost
    data["sale_price"] = sale_price
    data["payer_type"] = data.get("payer_type") or "private"
    data["billing_status"] = data.get("billing_status") or "pending"
    data["notes"] = data.get("notes") or ""
    data["active"] = True if data.get("active") is None else data.get("active")

    if not row:
        row = ServiceFinancialV2(
            company_id=company_id,
            intake_id=payload.intake_id,
            **data,
            total_cost=total_cost,
            margin_amount=margin_amount,
            margin_percent=margin_percent,
        )
    else:
        for key, value in data.items():
            setattr(row, key, value)

        row.supplies_cost = supplies_cost
        row.total_cost = total_cost
        row.margin_amount = margin_amount
        row.margin_percent = margin_percent

    db.add(row)
    db.commit()
    db.refresh(row)
    return row