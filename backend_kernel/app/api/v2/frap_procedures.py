from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.frap_procedure_v2 import FrapProcedureV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.schemas.v2.frap_procedure import FrapProcedureV2Create, FrapProcedureV2Out
from app.services.license_guard import require_company_feature
from app.services.retrospective_guard import (
    require_retrospective_timestamp,
    require_retrospective_write_access,
    validate_semantic_timestamp,
)
from app.services.timeline_service import create_dispatch_event

router = APIRouter(prefix="/v2/frap-procedures", tags=["v2-frap-procedures"])


@router.get("/{intake_id}", response_model=List[FrapProcedureV2Out])
def list_frap_procedures(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "clinical")

    return (
        db.query(FrapProcedureV2)
        .filter(
            FrapProcedureV2.company_id == company_id,
            FrapProcedureV2.intake_id == intake_id,
        )
        .order_by(FrapProcedureV2.created_at.asc())
        .all()
    )


@router.post("/", response_model=FrapProcedureV2Out, status_code=201)
def create_frap_procedure(
    payload: FrapProcedureV2Create,
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

    performed_at = validate_semantic_timestamp(
        intake=intake,
        user=user,
        value=payload.performed_at,
        field_name="performed_at",
    )

    require_retrospective_timestamp(
        intake=intake,
        value=performed_at,
        field_name="performed_at",
    )

    row = FrapProcedureV2(
        company_id=company_id,
        intake_id=payload.intake_id,
        procedure_name=payload.procedure_name,
        performed_at=performed_at,
        status=payload.status,
        body_site=payload.body_site,
        successful=payload.successful,
        notes=payload.notes,
    )

    db.add(row)
    db.commit()
    db.refresh(row)

    create_dispatch_event(
        db=db,
        company_id=company_id,
        intake_id=payload.intake_id,
        event_type="clinical.procedure_performed",
        status_label="Procedimiento realizado",
        payload={
            "procedure": payload.procedure_name,
            "body_site": payload.body_site,
        },
        occurred_at=row.performed_at,
    )

    return row