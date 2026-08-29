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
from app.models.service_location_v2 import ServiceLocationV2
from app.models.unit import Unit
from app.schemas.v2.service_intake import (
    ServiceIntakeV2Create,
    ServiceIntakeV2Out,
    ServiceIntakeV2Update,
)
from app.schemas.v2.service_location import ServiceLocationV2Create
from app.services.company_license_service import CompanyLicenseService
from app.services.retrospective_guard import (
    RETROSPECTIVE_CAPTURE_MODE,
    require_retrospective_role,
    require_retrospective_write_access,
    validate_capture_mode,
    validate_semantic_timestamp,
)
from app.services.service_operation_v2 import (
    evaluate_coverage,
    legacy_location_values,
    normalize_operation_mode,
    primary_location,
    resolve_billing_scope,
    validate_locations,
    validate_parent_standby,
    validate_standby_fields,
)

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


def _location_dict(row: ServiceLocationV2) -> dict:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "intake_id": row.intake_id,
        "location_role": row.location_role,
        "place_type": row.place_type,
        "name": row.name,
        "address_text": row.address_text,
        "reference": row.reference,
        "lat": row.lat,
        "lng": row.lng,
        "sequence": row.sequence,
        "active": row.active,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def _intake_out_dict(
    row: ServiceIntakeV2,
    locations: list[ServiceLocationV2] | None = None,
) -> dict:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "service_id": row.service_id,
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
        "extra_json": row.extra_json,
        "active": row.active,
        "capture_mode": row.capture_mode,
        "occurred_at": row.occurred_at,
        "retrospective_reason": row.retrospective_reason,
        "retrospective_started_by_user_id": row.retrospective_started_by_user_id,
        "retrospective_started_at": row.retrospective_started_at,
        "approved_by_user_id": row.approved_by_user_id,
        "approved_at": row.approved_at,
        "operation_mode": row.operation_mode,
        "parent_intake_id": row.parent_intake_id,
        "standby_event_name": row.standby_event_name,
        "standby_starts_at": row.standby_starts_at,
        "standby_ends_at": row.standby_ends_at,
        "standby_billing_mode": row.standby_billing_mode,
        "coverage_status": row.coverage_status,
        "billing_scope": row.billing_scope,
        "coverage_evaluated_at": row.coverage_evaluated_at,
        "locations": [_location_dict(item) for item in (locations or [])],
    }


def _locations_for_intake(
    db: Session,
    company_id: uuid.UUID,
    intake_id: uuid.UUID,
) -> list[ServiceLocationV2]:
    return (
        db.query(ServiceLocationV2)
        .filter(
            ServiceLocationV2.company_id == company_id,
            ServiceLocationV2.intake_id == intake_id,
        )
        .order_by(
            ServiceLocationV2.sequence.asc(),
            ServiceLocationV2.created_at.asc(),
        )
        .all()
    )


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

    location_rows = (
        db.query(ServiceLocationV2)
        .filter(
            ServiceLocationV2.company_id == company_id,
            ServiceLocationV2.intake_id.in_(intake_ids),
        )
        .order_by(
            ServiceLocationV2.intake_id.asc(),
            ServiceLocationV2.sequence.asc(),
            ServiceLocationV2.created_at.asc(),
        )
        .all()
    )

    locations_by_intake: dict[uuid.UUID, list[ServiceLocationV2]] = {}

    for location in location_rows:
        locations_by_intake.setdefault(location.intake_id, []).append(location)

    return [
        _intake_out_dict(
            row,
            locations_by_intake.get(row.id, []),
        )
        for row in rows
    ]


@router.get("/{intake_id}", response_model=ServiceIntakeV2Out)
def get_service_intake(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    row = (
        db.query(ServiceIntakeV2)
        .filter(
            ServiceIntakeV2.id == intake_id,
            ServiceIntakeV2.company_id == company_id,
        )
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Service intake not found")

    return _intake_out_dict(
        row,
        _locations_for_intake(db, company_id, row.id),
    )


@router.post("/", response_model=ServiceIntakeV2Out, status_code=201)
def create_service_intake(
    payload: ServiceIntakeV2Create,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    _enforce_monthly_service_limit(db, company_id)

    capture_mode = validate_capture_mode(payload.capture_mode)

    if capture_mode == RETROSPECTIVE_CAPTURE_MODE:
        require_retrospective_role(user)

        if payload.occurred_at is None:
            raise HTTPException(
                status_code=422,
                detail="occurred_at es obligatorio en captura retrospectiva",
            )
    elif payload.occurred_at is not None:
        raise HTTPException(
            status_code=422,
            detail="occurred_at sólo puede declararse en captura retrospectiva",
        )

    if (
        capture_mode != RETROSPECTIVE_CAPTURE_MODE
        and str(payload.retrospective_reason or "").strip()
    ):
        raise HTTPException(
            status_code=422,
            detail="retrospective_reason sólo aplica a captura retrospectiva",
        )

    if payload.service_id:
        svc = (
            db.query(Service)
            .filter(
                Service.id == payload.service_id,
                Service.company_id == company_id,
            )
            .first()
        )

        if not svc:
            raise HTTPException(status_code=404, detail="Linked service not found")

    operation_mode = normalize_operation_mode(payload.operation_mode)

    requested_locations = list(payload.locations or [])

    # Compatibilidad con clientes/frontend anteriores a ubicaciones estructuradas.
    # Un servicio scene legacy se convierte internamente en una ubicación scene.
    if operation_mode == "scene" and not requested_locations:
        legacy_lat = None
        legacy_lng = None

        try:
            if payload.lat not in (None, ""):
                legacy_lat = float(payload.lat)

            if payload.lng not in (None, ""):
                legacy_lng = float(payload.lng)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=422,
                detail="Las coordenadas legacy no tienen un formato válido",
            )

        requested_locations = [
            ServiceLocationV2Create(
                location_role="scene",
                name=str(payload.location_text or "").strip(),
                address_text=str(payload.location_text or "").strip(),
                reference=str(payload.location_reference or "").strip(),
                lat=legacy_lat,
                lng=legacy_lng,
                sequence=1,
                active=True,
            )
        ]

    locations = validate_locations(
        operation_mode=operation_mode,
        locations=requested_locations,
    )

    standby_billing_mode = validate_standby_fields(
        operation_mode=operation_mode,
        standby_event_name=payload.standby_event_name,
        standby_starts_at=payload.standby_starts_at,
        standby_ends_at=payload.standby_ends_at,
        standby_billing_mode=payload.standby_billing_mode,
    )

    parent = None

    if payload.parent_intake_id is not None:
        parent = (
            db.query(ServiceIntakeV2)
            .filter(
                ServiceIntakeV2.id == payload.parent_intake_id,
                ServiceIntakeV2.company_id == company_id,
            )
            .first()
        )

        if not parent:
            raise HTTPException(
                status_code=404,
                detail="Guardia padre no encontrada",
            )

    validate_parent_standby(
        parent=parent,
        operation_mode=operation_mode,
    )

    if parent is None and payload.parent_intake_id is not None:
        raise HTTPException(
            status_code=404,
            detail="Guardia padre no encontrada",
        )

    billing_scope = resolve_billing_scope(
        parent=parent,
        requested_scope=payload.billing_scope,
    )

    event_time = (
        payload.occurred_at
        if capture_mode == RETROSPECTIVE_CAPTURE_MODE
        else datetime.now(timezone.utc)
    )

    coverage_status, coverage_evaluated_at = evaluate_coverage(
        parent=parent,
        event_time=event_time,
    )

    main_location = primary_location(
        operation_mode=operation_mode,
        locations=locations,
    )

    (
        legacy_location_text,
        legacy_location_reference,
        legacy_lat,
        legacy_lng,
    ) = legacy_location_values(main_location)

    data = payload.model_dump(
        exclude={
            "locations",
            "operation_mode",
            "parent_intake_id",
            "standby_event_name",
            "standby_starts_at",
            "standby_ends_at",
            "standby_billing_mode",
            "billing_scope",
        }
    )

    data["capture_mode"] = capture_mode
    data["operation_mode"] = operation_mode
    data["parent_intake_id"] = payload.parent_intake_id

    data["standby_event_name"] = (
        str(payload.standby_event_name or "").strip()
        if operation_mode == "standby"
        else None
    )
    data["standby_starts_at"] = (
        payload.standby_starts_at
        if operation_mode == "standby"
        else None
    )
    data["standby_ends_at"] = (
        payload.standby_ends_at
        if operation_mode == "standby"
        else None
    )
    data["standby_billing_mode"] = standby_billing_mode

    data["coverage_status"] = coverage_status
    data["billing_scope"] = billing_scope
    data["coverage_evaluated_at"] = coverage_evaluated_at

    # Mantener compatibilidad con Board/mapa/PDF legacy.
    data["location_text"] = legacy_location_text
    data["location_reference"] = legacy_location_reference
    data["lat"] = legacy_lat
    data["lng"] = legacy_lng

    if capture_mode == RETROSPECTIVE_CAPTURE_MODE:
        data["retrospective_started_by_user_id"] = getattr(user, "id", None)
        data["retrospective_started_at"] = datetime.now(timezone.utc)

    row = ServiceIntakeV2(
        company_id=company_id,
        **data,
    )

    db.add(row)
    db.flush()

    location_models: list[ServiceLocationV2] = []

    for location in locations:
        location_model = ServiceLocationV2(
            company_id=company_id,
            intake_id=row.id,
            location_role=location.location_role,
            place_type=location.place_type,
            name=str(location.name or "").strip(),
            address_text=str(location.address_text or "").strip(),
            reference=str(location.reference or "").strip(),
            lat=location.lat,
            lng=location.lng,
            sequence=location.sequence,
            active=location.active,
        )

        db.add(location_model)
        location_models.append(location_model)

    created_event = ServiceDispatchEventV2(
        company_id=company_id,
        intake_id=row.id,
        service_id=row.service_id,
        unit_id=None,
        event_type="service_created",
        status_label=DISPATCH_EVENT_LABELS["service_created"],
        notes=(row.notes or "").strip(),
        event_payload={
            "operation_mode": operation_mode,
            "parent_intake_id": (
                str(row.parent_intake_id)
                if row.parent_intake_id
                else None
            ),
            "coverage_status": coverage_status,
            "billing_scope": billing_scope,
        },
        occurred_at=row.occurred_at,
    )

    db.add(created_event)

    db.commit()
    db.refresh(row)

    location_models = _locations_for_intake(
        db,
        company_id,
        row.id,
    )

    return _intake_out_dict(row, location_models)


@router.post(
    "/{intake_id}/approve-retrospective",
    response_model=ServiceIntakeV2Out,
)
def approve_retrospective_service_intake(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_retrospective_role(user)

    row = (
        db.query(ServiceIntakeV2)
        .filter(
            ServiceIntakeV2.id == intake_id,
            ServiceIntakeV2.company_id == company_id,
        )
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Service intake not found")

    if validate_capture_mode(row.capture_mode) != RETROSPECTIVE_CAPTURE_MODE:
        raise HTTPException(
            status_code=409,
            detail="Sólo una captura retrospectiva puede aprobarse",
        )

    if row.approved_at is not None or row.approved_by_user_id is not None:
        return _intake_out_dict(
            row,
            _locations_for_intake(db, company_id, row.id),
        )

    user_id = getattr(user, "id", None)
    if user_id is None:
        raise HTTPException(
            status_code=403,
            detail="No fue posible identificar al usuario aprobador",
        )

    row.approved_by_user_id = user_id
    row.approved_at = datetime.now(timezone.utc)

    db.add(row)
    db.commit()
    db.refresh(row)

    return _intake_out_dict(
        row,
        _locations_for_intake(db, company_id, row.id),
    )


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
        .filter(
            ServiceIntakeV2.id == intake_id,
            ServiceIntakeV2.company_id == company_id,
        )
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Service intake not found")

    changes = payload.model_dump(exclude_unset=True)

    protected_operation_fields = {
        "standby_event_name",
        "standby_starts_at",
        "standby_ends_at",
        "standby_billing_mode",
        "billing_scope",
    }

    attempted_protected = sorted(
        protected_operation_fields.intersection(changes.keys())
    )

    if attempted_protected:
        raise HTTPException(
            status_code=422,
            detail=(
                "Estos campos operativos requieren un flujo de edición dedicado: "
                + ", ".join(attempted_protected)
            ),
        )

    require_retrospective_write_access(row, user)

    if "capture_mode" in changes:
        requested_mode = validate_capture_mode(changes["capture_mode"])
        current_mode = validate_capture_mode(row.capture_mode)

        if requested_mode != current_mode:
            raise HTTPException(
                status_code=422,
                detail="capture_mode no puede modificarse después de crear el intake",
            )

        changes.pop("capture_mode", None)

    if "occurred_at" in changes:
        if (
            row.capture_mode == RETROSPECTIVE_CAPTURE_MODE
            and changes["occurred_at"] is None
        ):
            raise HTTPException(
                status_code=422,
                detail="occurred_at no puede eliminarse de una captura retrospectiva",
            )

        changes["occurred_at"] = validate_semantic_timestamp(
            intake=row,
            user=user,
            value=changes["occurred_at"],
            field_name="occurred_at",
        )

    if (
        "retrospective_reason" in changes
        and row.capture_mode != RETROSPECTIVE_CAPTURE_MODE
    ):
        raise HTTPException(
            status_code=422,
            detail="retrospective_reason sólo aplica a captura retrospectiva",
        )

    if "service_id" in changes and changes["service_id"]:
        svc = (
            db.query(Service)
            .filter(
                Service.id == changes["service_id"],
                Service.company_id == company_id,
            )
            .first()
        )

        if not svc:
            raise HTTPException(status_code=404, detail="Linked service not found")

    for key, value in changes.items():
        setattr(row, key, value)

    db.add(row)
    db.commit()
    db.refresh(row)

    return _intake_out_dict(
        row,
        _locations_for_intake(db, company_id, row.id),
    )
