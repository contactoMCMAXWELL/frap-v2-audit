from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.frap_vital_sign_v2 import FrapVitalSignV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.schemas.v2.frap_vital_sign import FrapVitalSignV2Create, FrapVitalSignV2Out
from app.services.license_guard import require_company_feature
from app.services.timeline_service import create_dispatch_event

router = APIRouter(prefix="/v2/frap-vital-signs", tags=["v2-frap-vital-signs"])


@router.get("/{intake_id}", response_model=List[FrapVitalSignV2Out])
def list_frap_vital_signs(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "clinical")

    return (
        db.query(FrapVitalSignV2)
        .filter(
            FrapVitalSignV2.company_id == company_id,
            FrapVitalSignV2.intake_id == intake_id,
        )
        .order_by(FrapVitalSignV2.created_at.asc())
        .all()
    )


@router.post("/", response_model=FrapVitalSignV2Out, status_code=201)
def create_frap_vital_sign(
    payload: FrapVitalSignV2Create,
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

    row = FrapVitalSignV2(
        company_id=company_id,
        intake_id=payload.intake_id,
        taken_at_label=payload.taken_at_label,
        blood_pressure=payload.blood_pressure,
        heart_rate=payload.heart_rate,
        respiratory_rate=payload.respiratory_rate,
        spo2=payload.spo2,
        temperature=payload.temperature,
        glucose=payload.glucose,
        pain_scale=payload.pain_scale,
        pupils=payload.pupils,
        notes=payload.notes,
    )

    db.add(row)
    db.commit()
    db.refresh(row)

    create_dispatch_event(
        db=db,
        company_id=company_id,
        intake_id=payload.intake_id,
        event_type="clinical.vital_sign_recorded",
        status_label="Signos vitales registrados",
        payload={
            "blood_pressure": payload.blood_pressure,
            "heart_rate": payload.heart_rate,
            "spo2": payload.spo2,
        },
    )

    return row