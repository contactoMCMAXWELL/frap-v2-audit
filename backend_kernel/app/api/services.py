# app/api/services.py

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.service import Service
from app.schemas.service import ServiceCreate, ServiceOut  # ✅ usa schemas reales

# Intento robusto para Unit (por si el modelo se llama distinto)
try:
    from app.models.unit import Unit  # type: ignore
except Exception:  # pragma: no cover
    from app.models.units import Unit  # type: ignore

# Nota: se mantiene prefix="/services" para conservar /api/services/services/
router = APIRouter(prefix="/services", tags=["services"])


# --- Service status machine (FRAP) ---
SUPPORTED_STATUSES = {
    "draft",
    "assigned",
    "accepted",
    "en_route",
    "on_scene",
    "transport",
    "delivered",
    "finished",
}

# Transiciones permitidas (máquina de estados)
ALLOWED_TRANSITIONS = {
    "draft": {"assigned"},
    "assigned": {"accepted"},
    "accepted": {"en_route"},
    "en_route": {"on_scene"},
    "on_scene": {"transport"},
    "transport": {"delivered"},
    "delivered": {"finished"},
    "finished": set(),
}

# Para setear timestamps (solo cuando entras a ese estado)
STATUS_TO_TS_FIELD = {
    "assigned": "assigned_at",
    "accepted": "accepted_at",
    "en_route": "en_route_at",
    "on_scene": "on_scene_at",
    "transport": "transport_at",
    "delivered": "delivered_at",
    "finished": "finished_at",
}


def _normalize_status(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def _validate_transition(current: str, new: str) -> None:
    # Permite idempotencia (setear el mismo estado no rompe)
    if new == current:
        return
    allowed_next = ALLOWED_TRANSITIONS.get(current, set())
    if new not in allowed_next:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition: {current} -> {new}. Allowed: {sorted(list(allowed_next))}",
        )


def _apply_timestamp(svc: Service, new_status: str, now):
    field = STATUS_TO_TS_FIELD.get(new_status)
    if not field:
        return
    if getattr(svc, field, None) is None:
        setattr(svc, field, now)


class StatusIn(BaseModel):
    status: Optional[str] = None


class AssignUnitIn(BaseModel):
    unit_id: uuid.UUID


@router.get("/", response_model=List[ServiceOut])
def list_services(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    services: List[Service] = (
        db.query(Service)
        .filter(Service.company_id == company_id)
        .order_by(Service.created_at.desc())
        .limit(200)
        .all()
    )

    out: List[ServiceOut] = []
    for svc in services:
        frap_obj = getattr(svc, "frap", None)
        frap_id = getattr(svc, "frap_id", None) or (getattr(frap_obj, "id", None) if frap_obj else None)
        frap_folio = getattr(svc, "frap_folio", None) or (getattr(frap_obj, "folio", None) if frap_obj else None)

        out.append(
            ServiceOut(
                id=svc.id,
                company_id=svc.company_id,
                unit_id=svc.unit_id,
                status=svc.status,
                frap_id=frap_id,
                frap_folio=frap_folio,
                priority=svc.priority,
                service_type=getattr(svc, "service_type", None),
                location=getattr(svc, "location", None),
                motive=getattr(svc, "motive", None),
                requested_by=getattr(svc, "requested_by", None),
                created_at=svc.created_at,
                assigned_at=getattr(svc, "assigned_at", None),
                accepted_at=getattr(svc, "accepted_at", None),
                en_route_at=getattr(svc, "en_route_at", None),
                on_scene_at=getattr(svc, "on_scene_at", None),
                transport_at=getattr(svc, "transport_at", None),
                delivered_at=getattr(svc, "delivered_at", None),
                closed_at=getattr(svc, "closed_at", None),
                finished_at=getattr(svc, "finished_at", None),
            )
        )

    return out


@router.get("/statuses")
def get_supported_statuses(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return sorted(list(SUPPORTED_STATUSES))


@router.post("/", response_model=ServiceOut, status_code=201)
def create_service(
    payload: ServiceCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    status_in = _normalize_status(getattr(payload, "status", None)) or "draft"
    if status_in not in SUPPORTED_STATUSES:
        raise HTTPException(status_code=422, detail=f"Unsupported status: {status_in}")

    unit_id = getattr(payload, "unit_id", None)

    # Si crean directo en assigned, exige unit_id
    if status_in == "assigned" and not unit_id:
        raise HTTPException(status_code=400, detail="unit_id is required when creating service with status=assigned")

    row = Service(
        company_id=company_id,
        unit_id=unit_id,
        status=status_in,
        priority=getattr(payload, "priority", None),
        service_type=getattr(payload, "service_type", None),
        location=getattr(payload, "location", None),
        motive=getattr(payload, "motive", None),
        requested_by=getattr(payload, "requested_by", None),
    )

    # timestamps si nace assigned (solo permitimos draft o assigned)
    now = func.now()
    if status_in != "draft":
        if status_in not in {"assigned"}:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid initial status: {status_in}. Allowed initial: ['draft','assigned']",
            )
        _apply_timestamp(row, status_in, now)

    db.add(row)
    db.commit()
    db.refresh(row)

    frap_obj = getattr(row, "frap", None)
    frap_id = getattr(row, "frap_id", None) or (getattr(frap_obj, "id", None) if frap_obj else None)
    frap_folio = getattr(row, "frap_folio", None) or (getattr(frap_obj, "folio", None) if frap_obj else None)

    return ServiceOut(
        id=row.id,
        company_id=row.company_id,
        unit_id=row.unit_id,
        status=row.status,
        frap_id=frap_id,
        frap_folio=frap_folio,
        priority=row.priority,
        service_type=getattr(row, "service_type", None),
        location=getattr(row, "location", None),
        motive=getattr(row, "motive", None),
        requested_by=getattr(row, "requested_by", None),
        created_at=row.created_at,
        assigned_at=getattr(row, "assigned_at", None),
        accepted_at=getattr(row, "accepted_at", None),
        en_route_at=getattr(row, "en_route_at", None),
        on_scene_at=getattr(row, "on_scene_at", None),
        transport_at=getattr(row, "transport_at", None),
        delivered_at=getattr(row, "delivered_at", None),
        closed_at=getattr(row, "closed_at", None),
        finished_at=getattr(row, "finished_at", None),
    )


@router.post("/{service_id}/assign-unit")
def assign_unit(
    service_id: uuid.UUID,
    payload: AssignUnitIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    svc = (
        db.query(Service)
        .filter(Service.id == service_id, Service.company_id == company_id)
        .first()
    )
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    unit = (
        db.query(Unit)
        .filter(Unit.id == payload.unit_id, Unit.company_id == company_id)
        .first()
    )
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found for this company")

    if hasattr(unit, "active") and not bool(getattr(unit, "active")):
        raise HTTPException(status_code=409, detail="Unit is not active")

    # Asignar unit_id
    svc.unit_id = payload.unit_id

    # Si está en draft, lo pasamos a assigned respetando máquina de estados
    current_status = _normalize_status(getattr(svc, "status", None)) or "draft"
    if current_status == "draft":
        svc.status = "assigned"
        _apply_timestamp(svc, "assigned", func.now())

    db.add(svc)
    db.commit()
    db.refresh(svc)

    return {
        "ok": True,
        "id": str(svc.id),
        "unit_id": str(svc.unit_id) if svc.unit_id else None,
        "status": svc.status,
        "assigned_at": getattr(svc, "assigned_at", None),
    }


@router.post("/{service_id}/status")
def update_service_status(
    service_id: uuid.UUID,
    payload: StatusIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    svc = (
        db.query(Service)
        .filter(Service.id == service_id, Service.company_id == company_id)
        .first()
    )
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    new_status = _normalize_status(getattr(payload, "status", None))
    if not new_status:
        raise HTTPException(status_code=422, detail="status is required")

    if new_status not in SUPPORTED_STATUSES:
        raise HTTPException(status_code=422, detail=f"Unsupported status: {new_status}")

    current_status = _normalize_status(getattr(svc, "status", None)) or "draft"
    if current_status not in SUPPORTED_STATUSES:
        raise HTTPException(
            status_code=409,
            detail=f"Current service status is invalid/corrupted: {current_status}",
        )

    _validate_transition(current_status, new_status)

    # Regla: para pasar a assigned, debe existir unit_id
    if new_status == "assigned" and not getattr(svc, "unit_id", None):
        raise HTTPException(status_code=400, detail="Cannot set status=assigned without unit_id (assign a unit first)")

    svc.status = new_status
    now = func.now()
    _apply_timestamp(svc, new_status, now)

    if new_status == "finished":
        if getattr(svc, "closed_at", None) is None:
            svc.closed_at = now

    db.add(svc)
    db.commit()
    db.refresh(svc)

    return {
        "ok": True,
        "id": str(svc.id),
        "status": svc.status,
        "timestamps": {
            "assigned_at": getattr(svc, "assigned_at", None),
            "accepted_at": getattr(svc, "accepted_at", None),
            "en_route_at": getattr(svc, "en_route_at", None),
            "on_scene_at": getattr(svc, "on_scene_at", None),
            "transport_at": getattr(svc, "transport_at", None),
            "delivered_at": getattr(svc, "delivered_at", None),
            "finished_at": getattr(svc, "finished_at", None),
            "closed_at": getattr(svc, "closed_at", None),
        },
    }