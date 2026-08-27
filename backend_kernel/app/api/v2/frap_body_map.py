from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.frap_body_map_v2 import FrapBodyMapV2
from app.models.service_dispatch_event_v2 import ServiceDispatchEventV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.schemas.v2.frap_body_map import (
    FrapBodyMapV2Out,
    FrapBodyMapV2Upsert,
)

router = APIRouter(prefix="/v2/frap-body-map", tags=["v2-frap-body-map"])


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


def _build_summary(payload: FrapBodyMapV2Upsert) -> str:
    parts: list[str] = []

    anterior_count = len(payload.anterior_regions or [])
    posterior_count = len(payload.posterior_regions or [])
    injury_count = len(payload.injuries or [])

    if anterior_count:
        parts.append(f"Anterior {anterior_count}")
    if posterior_count:
        parts.append(f"Posterior {posterior_count}")
    if injury_count:
        parts.append(f"Lesiones {injury_count}")
    if payload.status:
        parts.append(f"Estado {payload.status}")

    if payload.summary:
        return payload.summary

    return " · ".join(parts)


@router.get("/{intake_id}", response_model=FrapBodyMapV2Out)
def get_body_map(
    intake_id: uuid.UUID,
    response: Response,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    _ = current_user

    _get_intake_or_404(db, intake_id, company_id)

    record = (
        db.query(FrapBodyMapV2)
        .filter(
            FrapBodyMapV2.intake_id == intake_id,
            FrapBodyMapV2.company_id == company_id,
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Body map not found")

    response.headers["Cache-Control"] = "no-store"
    return record


@router.put("/{intake_id}", response_model=FrapBodyMapV2Out)
def upsert_body_map(
    intake_id: uuid.UUID,
    payload: FrapBodyMapV2Upsert,
    response: Response,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    intake = _get_intake_or_404(db, intake_id, company_id)

    record = (
        db.query(FrapBodyMapV2)
        .filter(
            FrapBodyMapV2.intake_id == intake_id,
            FrapBodyMapV2.company_id == company_id,
        )
        .first()
    )

    data = payload.model_dump()
    computed_summary = _build_summary(payload)
    if not data.get("summary"):
        data["summary"] = computed_summary

    if record is None:
        record = FrapBodyMapV2(
            company_id=company_id,
            intake_id=intake_id,
            **data,
        )
        db.add(record)
    else:
        for field, value in data.items():
            setattr(record, field, value)

    db.flush()

    event = ServiceDispatchEventV2(
        company_id=company_id,
        intake_id=intake.id,
        service_id=getattr(intake, "service_id", None),
        unit_id=getattr(intake, "unit_id", None),
        event_type="clinical.body_map_updated",
        status_label="Lesiones corporales actualizadas",
        notes="Body Map V2 guardado/actualizado",
        event_payload={
            "module": "frap_body_map_v2",
            "intake_id": str(intake.id),
            "updated_by_user_id": str(getattr(current_user, "id", "")) if getattr(current_user, "id", None) else None,
            "status": record.status,
            "anterior_regions": record.anterior_regions or [],
            "posterior_regions": record.posterior_regions or [],
            "injuries": record.injuries or [],
            "summary": record.summary,
            "notes": record.notes,
        },
    )
    db.add(event)

    db.commit()
    db.refresh(record)

    response.headers["Cache-Control"] = "no-store"
    return record