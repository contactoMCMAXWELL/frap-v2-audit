from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.frap_handoff_v2 import FrapHandoffV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.schemas.v2.frap_handoff import FrapHandoffOut, FrapHandoffUpsert
from app.services.license_guard import require_company_feature
from app.services.retrospective_guard import (
    require_retrospective_timestamp,
    require_retrospective_write_access,
)
from app.services.timeline_service import create_dispatch_event

router = APIRouter(prefix="/v2/frap-handoff", tags=["v2-frap-handoff"])


@router.get("/{intake_id}", response_model=FrapHandoffOut)
def get_handoff(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "clinical")

    row = (
        db.query(FrapHandoffV2)
        .filter(
            FrapHandoffV2.company_id == company_id,
            FrapHandoffV2.intake_id == intake_id,
        )
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Handoff record not found")

    return row


@router.put("/", response_model=FrapHandoffOut)
def upsert_handoff(
    payload: FrapHandoffUpsert,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "clinical")

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

    require_retrospective_write_access(intake, user)

    row = (
        db.query(FrapHandoffV2)
        .filter(
            FrapHandoffV2.company_id == company_id,
            FrapHandoffV2.intake_id == payload.intake_id,
        )
        .first()
    )

    handoff_at_was_sent = "handoff_at" in payload.model_fields_set

    if handoff_at_was_sent:
        handoff_at = payload.handoff_at
    else:
        handoff_at = row.handoff_at if row is not None else None

    if row is None or handoff_at_was_sent:
        require_retrospective_timestamp(
            intake=intake,
            value=handoff_at,
            field_name="handoff_at",
        )

    if not row:
        row = FrapHandoffV2(
            company_id=company_id,
            intake_id=payload.intake_id,
        )

    data = payload.model_dump(exclude_unset=True)
    data.pop("intake_id", None)

    for key, value in data.items():
        setattr(row, key, value)

    db.add(row)
    db.commit()
    db.refresh(row)

    create_dispatch_event(
        db=db,
        company_id=company_id,
        intake_id=payload.intake_id,
        event_type="clinical.handoff_completed",
        status_label="Entrega de paciente registrada",
        occurred_at=row.handoff_at,
    )

    return row
