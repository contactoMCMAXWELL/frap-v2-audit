from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.frap_clinical_record_v2 import FrapClinicalRecordV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.schemas.v2.frap_clinical import (
    FrapClinicalRecordV2Out,
    FrapClinicalRecordV2Upsert,
)
from app.services.license_guard import require_company_feature

router = APIRouter(prefix="/v2/frap-clinical", tags=["v2-frap-clinical"])


@router.get("/{intake_id}", response_model=FrapClinicalRecordV2Out)
def get_frap_clinical(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "clinical")

    row = (
        db.query(FrapClinicalRecordV2)
        .filter(
            FrapClinicalRecordV2.company_id == company_id,
            FrapClinicalRecordV2.intake_id == intake_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Clinical record not found")
    return row


@router.put("/", response_model=FrapClinicalRecordV2Out)
def upsert_frap_clinical(
    payload: FrapClinicalRecordV2Upsert,
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

    row = (
        db.query(FrapClinicalRecordV2)
        .filter(
            FrapClinicalRecordV2.company_id == company_id,
            FrapClinicalRecordV2.intake_id == payload.intake_id,
        )
        .first()
    )

    data = payload.model_dump(exclude_unset=True)
    data.pop("intake_id", None)

    glasgow_total = 0
    for val in [data.get("glasgow_eye"), data.get("glasgow_verbal"), data.get("glasgow_motor")]:
        try:
            glasgow_total += int(val or 0)
        except Exception:
            pass
    data["glasgow_total"] = str(glasgow_total) if glasgow_total > 0 else ""

    if not row:
        row = FrapClinicalRecordV2(
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
    return row