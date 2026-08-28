from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.frap_medication_v2 import FrapMedicationV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.schemas.v2.frap_medication import (
    FrapMedicationV2Create,
    FrapMedicationV2Out,
)
from app.services.license_guard import require_company_feature
from app.services.retrospective_guard import (
    require_retrospective_timestamp,
    require_retrospective_write_access,
    validate_semantic_timestamp,
)
from app.services.timeline_service import create_dispatch_event

router = APIRouter(prefix="/v2/frap-medications", tags=["v2-frap-medications"])


@router.get("/{intake_id}", response_model=List[FrapMedicationV2Out])
def list_frap_medications(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "clinical")

    return (
        db.query(FrapMedicationV2)
        .filter(
            FrapMedicationV2.company_id == company_id,
            FrapMedicationV2.intake_id == intake_id,
        )
        .order_by(FrapMedicationV2.created_at.asc())
        .all()
    )


@router.post("/", response_model=FrapMedicationV2Out, status_code=201)
def create_frap_medication(
    payload: FrapMedicationV2Create,
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

    administered_at = validate_semantic_timestamp(
        intake=intake,
        user=user,
        value=payload.administered_at,
        field_name="administered_at",
    )

    require_retrospective_timestamp(
        intake=intake,
        value=administered_at,
        field_name="administered_at",
    )

    row = FrapMedicationV2(
        company_id=company_id,
        intake_id=payload.intake_id,
        medication_name=payload.medication_name,
        administered_at=administered_at,
        dose=payload.dose,
        route=payload.route,
        response=payload.response,
        notes=payload.notes,
    )

    db.add(row)
    db.commit()
    db.refresh(row)

    create_dispatch_event(
        db=db,
        company_id=company_id,
        intake_id=payload.intake_id,
        event_type="clinical.medication_administered",
        status_label="Medicamento administrado",
        payload={
            "medication": payload.medication_name,
            "dose": payload.dose,
            "route": payload.route,
        },
        occurred_at=row.administered_at,
    )

    return row