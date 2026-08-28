from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.frap_refusal_v2 import FrapRefusalV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.schemas.v2.frap_refusal import FrapRefusalV2Out, FrapRefusalV2Upsert
from app.services.license_guard import require_company_feature
from app.services.retrospective_guard import (
    require_retrospective_timestamp,
    require_retrospective_write_access,
    validate_semantic_timestamp,
)
from app.services.timeline_service import create_dispatch_event

router = APIRouter(prefix="/v2/frap-refusal", tags=["v2-frap-refusal"])


@router.get("/{intake_id}", response_model=FrapRefusalV2Out)
def get_frap_refusal(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "clinical")

    row = (
        db.query(FrapRefusalV2)
        .filter(
            FrapRefusalV2.company_id == company_id,
            FrapRefusalV2.intake_id == intake_id,
        )
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Refusal record not found")

    return row


@router.put("/", response_model=FrapRefusalV2Out)
def upsert_frap_refusal(
    payload: FrapRefusalV2Upsert,
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
        db.query(FrapRefusalV2)
        .filter(
            FrapRefusalV2.company_id == company_id,
            FrapRefusalV2.intake_id == payload.intake_id,
        )
        .first()
    )

    refused_at_was_sent = "refused_at" in payload.model_fields_set

    if refused_at_was_sent:
        refused_at = validate_semantic_timestamp(
            intake=intake,
            user=user,
            value=payload.refused_at,
            field_name="refused_at",
        )
    else:
        refused_at = row.refused_at if row is not None else None

    if row is None or refused_at_was_sent:
        require_retrospective_timestamp(
            intake=intake,
            value=refused_at,
            field_name="refused_at",
        )

    data = payload.model_dump(exclude_unset=True)
    data.pop("intake_id", None)
    data["refused_at"] = refused_at

    if not row:
        row = FrapRefusalV2(
            company_id=company_id,
            intake_id=payload.intake_id,
            **data,
        )
    else:
        for key, value in data.items():
            setattr(row, key, value)

    db.add(row)
    db.commit()
    db.refresh(row)

    create_dispatch_event(
        db=db,
        company_id=company_id,
        intake_id=payload.intake_id,
        event_type="clinical.refusal_recorded",
        status_label="Negativa de atención registrada",
        occurred_at=row.refused_at,
    )

    return row
