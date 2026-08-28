from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.frap_assessment_v2 import FrapAssessmentV2
from app.models.service_dispatch_event_v2 import ServiceDispatchEventV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.schemas.frap_assessment_v2 import (
    FrapAssessmentV2Out,
    FrapAssessmentV2Upsert,
)
from app.services.retrospective_guard import (
    require_retrospective_timestamp,
    require_retrospective_write_access,
    validate_semantic_timestamp,
)

router = APIRouter(prefix="/v2/frap-assessment", tags=["v2-frap-assessment"])


def _get_intake_or_404(
    db: Session,
    intake_id: uuid.UUID,
    company_id: uuid.UUID,
) -> ServiceIntakeV2:
    intake = (
        db.query(ServiceIntakeV2)
        .filter(
            ServiceIntakeV2.id == intake_id,
            ServiceIntakeV2.company_id == company_id,
        )
        .first()
    )
    if not intake:
        raise HTTPException(status_code=404, detail="Service intake not found")
    return intake


def _glasgow_total(eye, verbal, motor) -> int | None:
    parts = [eye, verbal, motor]
    if all(v is None for v in parts):
        return None
    return int(eye or 0) + int(verbal or 0) + int(motor or 0)


@router.get("/{intake_id}", response_model=FrapAssessmentV2Out)
def get_assessment(
    intake_id: uuid.UUID,
    response: Response,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    _ = current_user

    _get_intake_or_404(db, intake_id, company_id)

    assessment = (
        db.query(FrapAssessmentV2)
        .filter(
            FrapAssessmentV2.intake_id == intake_id,
            FrapAssessmentV2.company_id == company_id,
        )
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    response.headers["Cache-Control"] = "no-store"
    return assessment


@router.put("/{intake_id}", response_model=FrapAssessmentV2Out)
def upsert_assessment(
    intake_id: uuid.UUID,
    payload: FrapAssessmentV2Upsert,
    response: Response,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    intake = _get_intake_or_404(db, intake_id, company_id)

    require_retrospective_write_access(intake, current_user)

    assessment = (
        db.query(FrapAssessmentV2)
        .filter(
            FrapAssessmentV2.intake_id == intake_id,
            FrapAssessmentV2.company_id == company_id,
        )
        .first()
    )

    assessed_at_was_sent = "assessed_at" in payload.model_fields_set

    if assessed_at_was_sent:
        assessed_at = validate_semantic_timestamp(
            intake=intake,
            user=current_user,
            value=payload.assessed_at,
            field_name="assessed_at",
        )
    else:
        assessed_at = (
            assessment.assessed_at
            if assessment is not None
            else None
        )

    if assessment is None or assessed_at_was_sent:
        require_retrospective_timestamp(
            intake=intake,
            value=assessed_at,
            field_name="assessed_at",
        )

    data = payload.model_dump()
    data["assessed_at"] = assessed_at

    if assessment is None:
        assessment = FrapAssessmentV2(
            company_id=company_id,
            intake_id=intake_id,
            **data,
        )
        db.add(assessment)
    else:
        for field, value in data.items():
            setattr(assessment, field, value)

    db.flush()

    glasgow_total = _glasgow_total(
        assessment.glasgow_eye,
        assessment.glasgow_verbal,
        assessment.glasgow_motor,
    )

    summary_parts = []
    if assessment.avpu:
        summary_parts.append(f"AVPU {assessment.avpu}")
    if glasgow_total is not None:
        summary_parts.append(f"Glasgow {glasgow_total}")
    if assessment.triage:
        summary_parts.append(f"Triage {assessment.triage}")

    event = ServiceDispatchEventV2(
        company_id=company_id,
        intake_id=intake.id,
        service_id=getattr(intake, "service_id", None),
        unit_id=getattr(intake, "unit_id", None),
        event_type="clinical.assessment_updated",
        occurred_at=assessment.assessed_at,
        status_label="Evaluacion clinica actualizada",
        notes="Assessment V2 guardado/actualizado",
        event_payload={
            "module": "frap_assessment_v2",
            "intake_id": str(intake.id),
            "updated_by_user_id": str(getattr(current_user, "id", "")) if getattr(current_user, "id", None) else None,
            "avpu": assessment.avpu,
            "glasgow_eye": assessment.glasgow_eye,
            "glasgow_verbal": assessment.glasgow_verbal,
            "glasgow_motor": assessment.glasgow_motor,
            "glasgow_total": glasgow_total,
            "triage": assessment.triage,
            "impression_primary": assessment.impression_primary,
            "impression_secondary": assessment.impression_secondary,
            "sample_s": assessment.sample_s,
            "sample_a": assessment.sample_a,
            "sample_m": assessment.sample_m,
            "sample_p": assessment.sample_p,
            "sample_l": assessment.sample_l,
            "sample_e": assessment.sample_e,
            "summary": " · ".join(summary_parts),
        },
    )
    db.add(event)

    db.commit()
    db.refresh(assessment)

    response.headers["Cache-Control"] = "no-store"
    return assessment