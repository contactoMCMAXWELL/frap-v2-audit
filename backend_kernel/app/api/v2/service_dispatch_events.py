from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.service import Service
from app.models.service_dispatch_event_v2 import ServiceDispatchEventV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.models.unit import Unit
from app.schemas.v2.service_dispatch_event import (
    ServiceDispatchEventV2Create,
    ServiceDispatchEventV2Out,
)
from app.services.retrospective_guard import (
    require_retrospective_timestamp,
    require_retrospective_write_access,
    validate_semantic_timestamp,
)

router = APIRouter(prefix="/v2/service-dispatch-events", tags=["v2-service-dispatch-events"])


ALLOWED_EVENT_TYPES = {
    "service_created": "Servicio creado",
    "unit_assigned": "Unidad asignada",
    "unit_reassigned": "Unidad reasignada",
    "unit_en_route": "Unidad en ruta",
    "unit_on_scene": "Unidad en escena",
    "patient_contact": "Contacto con paciente",
    "transport_started": "Inicio de traslado",
    "hospital_arrival": "Llegada a hospital",
    "service_closed": "Servicio cerrado",
}


@router.get("/{intake_id}", response_model=List[ServiceDispatchEventV2Out])
def list_dispatch_events(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    return (
        db.query(ServiceDispatchEventV2)
        .filter(
            ServiceDispatchEventV2.company_id == company_id,
            ServiceDispatchEventV2.intake_id == intake_id,
        )
        .order_by(ServiceDispatchEventV2.created_at.asc())
        .all()
    )


@router.post("/", response_model=ServiceDispatchEventV2Out, status_code=201)
def create_dispatch_event(
    payload: ServiceDispatchEventV2Create,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
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

    occurred_at = validate_semantic_timestamp(
        intake=intake,
        user=user,
        value=payload.occurred_at,
        field_name="occurred_at",
    )

    require_retrospective_timestamp(
        intake=intake,
        value=occurred_at,
        field_name="occurred_at",
    )

    if payload.service_id:
        svc = (
            db.query(Service)
            .filter(Service.id == payload.service_id, Service.company_id == company_id)
            .first()
        )
        if not svc:
            raise HTTPException(status_code=404, detail="Service not found")

    if payload.unit_id:
        unit = (
            db.query(Unit)
            .filter(Unit.id == payload.unit_id, Unit.company_id == company_id)
            .first()
        )
        if not unit:
            raise HTTPException(status_code=404, detail="Unit not found")

    event_type = (payload.event_type or "").strip()
    if event_type not in ALLOWED_EVENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported event_type: {event_type}",
        )

    status_label = (payload.status_label or "").strip() or ALLOWED_EVENT_TYPES[event_type]

    row = ServiceDispatchEventV2(
        company_id=company_id,
        intake_id=payload.intake_id,
        service_id=payload.service_id,
        unit_id=payload.unit_id,
        event_type=event_type,
        status_label=status_label,
        notes=(payload.notes or "").strip(),
        event_payload=payload.event_payload or {},
        occurred_at=occurred_at,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row