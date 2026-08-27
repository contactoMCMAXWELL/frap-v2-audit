from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.service import Service
from app.models.service_dispatch_event_v2 import ServiceDispatchEventV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.models.unit import Unit
from app.schemas.v2.service_intake import (
    ServiceIntakeV2Create,
    ServiceIntakeV2Out,
    ServiceIntakeV2Update,
)
from app.services.company_license_service import CompanyLicenseService

router = APIRouter(prefix="/v2/service-intake", tags=["v2-service-intake"])


DISPATCH_EVENT_LABELS = {
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

OPERATIVE_EVENT_TYPES = {
    "service_created",
    "unit_assigned",
    "unit_reassigned",
    "unit_en_route",
    "unit_on_scene",
    "patient_contact",
    "transport_started",
    "hospital_arrival",
    "service_closed",
    "assigned",  # compat legacy
}

UNIT_BOUND_EVENT_TYPES = {
    "unit_assigned",
    "unit_reassigned",
    "unit_en_route",
    "unit_on_scene",
    "patient_contact",
    "transport_started",
    "hospital_arrival",
    "service_closed",
    "assigned",  # compat legacy
}


def _current_month_start():
    now = datetime.now(timezone.utc)
    return datetime(now.year, now.month, 1, tzinfo=timezone.utc)


def _enforce_monthly_service_limit(db: Session, company_id: uuid.UUID):
    license_row = CompanyLicenseService.ensure_license(db, company_id)

    max_services = int(getattr(license_row, "max_services_month", 0) or 0)

    if max_services <= 0:
        return

    month_start = _current_month_start()

    current_services = (
        db.query(ServiceIntakeV2)
        .filter(
            ServiceIntakeV2.company_id == company_id,
            ServiceIntakeV2.created_at >= month_start,
        )
        .count()
    )

    if current_services >= max_services:
        raise HTTPException(
            status_code=403,
            detail=f"Monthly service limit reached ({current_services}/{max_services})",
        )


def _is_operative_event(evt: ServiceDispatchEventV2 | None) -> bool:
    if not evt:
        return False
    return str(getattr(evt, "event_type", "") or "").strip().lower() in OPERATIVE_EVENT_TYPES


def _latest_operative_event(events: list[ServiceDispatchEventV2]) -> ServiceDispatchEventV2 | None:
    operative = [evt for evt in events if _is_operative_event(evt)]
    if operative:
        return operative[-1]
    return events[-1] if events else None


def _latest_unit_event(events: list[ServiceDispatchEventV2]) -> ServiceDispatchEventV2 | None:
    unit_events = [
        evt
        for evt in events
        if str(getattr(evt, "event_type", "") or "").strip().lower() in UNIT_BOUND_EVENT_TYPES
        and getattr(evt, "unit_id", None)
    ]
    if unit_events:
        return unit_events[-1]
    return None


def _dispatch_preview_events(events: list[ServiceDispatchEventV2]) -> list[ServiceDispatchEventV2]:
    operative = [evt for evt in events if _is_operative_event(evt)]
    if operative:
        return operative[-3:]
    return events[-3:]


def _serialize_board_row(
    row: ServiceIntakeV2,
    latest_event: ServiceDispatchEventV2 | None,
    latest_unit_event: ServiceDispatchEventV2 | None,
    unit_code: str,
    preview_events: list[ServiceDispatchEventV2],
):
    latest_event_type = getattr(latest_event, "event_type", "") or "service_created"
    latest_label = (
        getattr(latest_event, "status_label", "") or DISPATCH_EVENT_LABELS.get(latest_event_type) or "Servicio creado"
    )
    latest_at = getattr(latest_event, "created_at", None) or getattr(row, "created_at", None)

    current_unit_id = None
    if latest_unit_event and getattr(latest_unit_event, "unit_id", None):
        current_unit_id = str(latest_unit_event.unit_id)

    return {
        "id": str(row.id),
        "company_id": str(row.company_id),
        "service_id": str(row.service_id) if row.service_id else None,
        "incident_number": row.incident_number,
        "service_type": row.service_type,
        "service_subtype": row.service_subtype,
        "priority_operational": row.priority_operational,
        "priority_clinical": row.priority_clinical,
        "call_source": row.call_source,
        "caller_name": row.caller_name,
        "caller_phone": row.caller_phone,
        "location_text": row.location_text,
        "location_reference": row.location_reference,
        "lat": row.lat,
        "lng": row.lng,
        "patient_count_estimated": row.patient_count_estimated,
        "scene_risk": row.scene_risk,
        "destination_suggested": row.destination_suggested,
        "payer_type": row.payer_type,
        "notes": row.notes,
        "active": row.active,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
        "dispatch_status": latest_event_type,
        "dispatch_status_label": latest_label,
        "dispatch_updated_at": latest_at,
        "current_unit_id": current_unit_id,
        "current_unit_code": unit_code or None,
        "timeline_preview": [
            {
                "id": str(evt.id),
                "event_type": evt.event_type,
                "status_label": evt.status_label,
                "notes": evt.notes,
                "unit_id": str(evt.unit_id) if evt.unit_id else None,
                "created_at": evt.created_at,
            }
            for evt in preview_events
        ],
    }


@router.get("/board")
def list_service_intake_board(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    rows = (
        db.query(ServiceIntakeV2)
        .filter(ServiceIntakeV2.company_id == company_id)
        .order_by(ServiceIntakeV2.created_at.desc())
        .limit(200)
        .all()
    )

    if not rows:
        return []

    intake_ids = [row.id for row in rows]

    events = (
        db.query(ServiceDispatchEventV2)
        .filter(
            ServiceDispatchEventV2.company_id == company_id,
            ServiceDispatchEventV2.intake_id.in_(intake_ids),
        )
        .order_by(
            ServiceDispatchEventV2.intake_id.asc(),
            ServiceDispatchEventV2.created_at.asc(),
        )
        .all()
    )

    events_by_intake = {}
    unit_ids = set()

    for evt in events:
        events_by_intake.setdefault(evt.intake_id, []).append(evt)
        if evt.unit_id:
            unit_ids.add(evt.unit_id)

    units_by_id = {}
    if unit_ids:
        units = (
            db.query(Unit)
            .filter(Unit.company_id == company_id, Unit.id.in_(list(unit_ids)))
            .all()
        )
        units_by_id = {u.id: u for u in units}

    output = []
    for row in rows:
        intake_events = events_by_intake.get(row.id, [])
        latest_event = _latest_operative_event(intake_events)
        latest_unit_event = _latest_unit_event(intake_events)
        preview_events = _dispatch_preview_events(intake_events)

        unit_code = ""
        if latest_unit_event and latest_unit_event.unit_id in units_by_id:
            unit_obj = units_by_id[latest_unit_event.unit_id]
            unit_code = getattr(unit_obj, "unit_code", "") or getattr(unit_obj, "code", "") or ""

        output.append(
            _serialize_board_row(
                row=row,
                latest_event=latest_event,
                latest_unit_event=latest_unit_event,
                unit_code=unit_code,
                preview_events=preview_events,
            )
        )

    return output


@router.get("/", response_model=List[ServiceIntakeV2Out])
def list_service_intakes(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    return (
        db.query(ServiceIntakeV2)
        .filter(ServiceIntakeV2.company_id == company_id)
        .order_by(ServiceIntakeV2.created_at.desc())
        .limit(200)
        .all()
    )


@router.get("/{intake_id}", response_model=ServiceIntakeV2Out)
def get_service_intake(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    row = (
        db.query(ServiceIntakeV2)
        .filter(ServiceIntakeV2.id == intake_id, ServiceIntakeV2.company_id == company_id)
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Service intake not found")

    return row


@router.post("/", response_model=ServiceIntakeV2Out, status_code=201)
def create_service_intake(
    payload: ServiceIntakeV2Create,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    _enforce_monthly_service_limit(db, company_id)

    if payload.service_id:
        svc = (
            db.query(Service)
            .filter(Service.id == payload.service_id, Service.company_id == company_id)
            .first()
        )

        if not svc:
            raise HTTPException(status_code=404, detail="Linked service not found")

    row = ServiceIntakeV2(
        company_id=company_id,
        **payload.model_dump(),
    )

    db.add(row)
    db.commit()
    db.refresh(row)

    created_event = ServiceDispatchEventV2(
        company_id=company_id,
        intake_id=row.id,
        service_id=row.service_id,
        unit_id=None,
        event_type="service_created",
        status_label=DISPATCH_EVENT_LABELS["service_created"],
        notes=(row.notes or "").strip(),
        event_payload={},
    )
    db.add(created_event)
    db.commit()

    return row


@router.patch("/{intake_id}", response_model=ServiceIntakeV2Out)
def update_service_intake(
    intake_id: uuid.UUID,
    payload: ServiceIntakeV2Update,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    row = (
        db.query(ServiceIntakeV2)
        .filter(ServiceIntakeV2.id == intake_id, ServiceIntakeV2.company_id == company_id)
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Service intake not found")

    changes = payload.model_dump(exclude_unset=True)

    if "service_id" in changes and changes["service_id"]:
        svc = (
            db.query(Service)
            .filter(Service.id == changes["service_id"], Service.company_id == company_id)
            .first()
        )

        if not svc:
            raise HTTPException(status_code=404, detail="Linked service not found")

    for key, value in changes.items():
        setattr(row, key, value)

    db.add(row)
    db.commit()
    db.refresh(row)

    return row