# app/api/fraps_v1.py
from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.frap import Frap
from app.models.service import Service
from app.models.frap_event import FrapEvent

from app.schemas.events import EventCreate, EventOut
from pydantic import BaseModel

from app.services.tenant import get_company_id
from app.services.authz import get_actor, require_roles
from app.services.frap_events import log_frap_event

router = APIRouter(prefix="/fraps", tags=["fraps-v1"])


# ----------------------------
# Helpers
# ----------------------------
def _actor_user_id(actor) -> Optional[UUID]:
    """
    get_actor() puede regresar dict o un objeto.
    Queremos un UUID (o None) para created_by.
    """
    if actor is None:
        return None
    # dict-style
    if isinstance(actor, dict):
        v = actor.get("user_id") or actor.get("id") or actor.get("uid")
        try:
            return UUID(str(v)) if v else None
        except Exception:
            return None
    # object-style
    v = getattr(actor, "user_id", None) or getattr(actor, "id", None) or getattr(actor, "uid", None)
    try:
        return UUID(str(v)) if v else None
    except Exception:
        return None


def _ensure_frap(db: Session, company_id: UUID, frap_id: UUID) -> Frap:
    frap = db.query(Frap).filter(Frap.id == frap_id, Frap.company_id == company_id).first()
    if not frap:
        raise HTTPException(status_code=404, detail="FRAP not found")
    return frap


def _service_status_items(svc: Service) -> list[dict[str, Any]]:
    """
    Genera hitos de status en orden cronológico con timestamps reales.
    Nota: 'requested' lo representamos con created_at (creación del service).
    """
    items: list[dict[str, Any]] = []

    def add(ts: Optional[datetime], to_status: str):
        if ts is None:
            return
        items.append({"ts": ts, "type": "status", "data": {"to_status": to_status}})

    add(getattr(svc, "created_at", None), "requested")
    add(getattr(svc, "assigned_at", None), "assigned")
    add(getattr(svc, "accepted_at", None), "accepted")
    add(getattr(svc, "en_route_at", None), "en_route")
    add(getattr(svc, "on_scene_at", None), "on_scene")
    add(getattr(svc, "transport_at", None), "transport")
    add(getattr(svc, "delivered_at", None), "delivered")
    add(getattr(svc, "closed_at", None), "closed")
    add(getattr(svc, "finished_at", None), "finished")

    # ya vienen en orden aproximado por add(), pero igual ordenamos por seguridad:
    items.sort(key=lambda x: x["ts"])
    return items


class TimelineItemOut(BaseModel):
    ts: datetime
    type: str
    data: dict[str, Any]


# ----------------------------
# Events
# ----------------------------
@router.post("/{frap_id}/events", response_model=EventOut, status_code=201)
def create_event(
    frap_id: UUID,
    payload: EventCreate,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    # Clínica: paramédico/doctor/admin (si quieres incluir dispatch para notas, lo agregamos después)
    require_roles(actor, "ADMIN", "PARAMEDIC", "DOCTOR", "RECEIVER_MD")

    frap = _ensure_frap(db, company_id, frap_id)

    if frap.locked_at is not None:
        raise HTTPException(status_code=409, detail="FRAP is locked; cannot add events")

    ev = log_frap_event(
        db,
        company_id=company_id,
        frap_id=frap_id,
        event_type=payload.type,
        data=payload.data or {},
        created_by=_actor_user_id(actor),
    )
    db.commit()
    db.refresh(ev)

    return EventOut(
        id=ev.id,
        frap_id=ev.frap_id,
        company_id=ev.company_id,
        type=ev.type,
        data=ev.data or {},
        ts=ev.ts,
        created_at=ev.created_at,
        created_by=ev.created_by,
    )


@router.get("/{frap_id}/events", response_model=list[EventOut])
def list_events(
    frap_id: UUID,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    require_roles(actor, "ADMIN", "DISPATCH", "PARAMEDIC", "DOCTOR", "RECEIVER_MD", "AUDITOR")
    _ensure_frap(db, company_id, frap_id)

    rows = (
        db.query(FrapEvent)
        .filter(FrapEvent.company_id == company_id, FrapEvent.frap_id == frap_id)
        .order_by(FrapEvent.ts.asc())
        .all()
    )

    return [
        EventOut(
            id=r.id,
            frap_id=r.frap_id,
            company_id=r.company_id,
            type=r.type,
            data=r.data or {},
            ts=r.ts,
            created_at=r.created_at,
            created_by=r.created_by,
        )
        for r in rows
    ]


# ----------------------------
# Timeline = status + events
# ----------------------------
@router.get("/{frap_id}/timeline", response_model=List[TimelineItemOut])
def get_timeline(
    frap_id: UUID,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    require_roles(actor, "ADMIN", "DISPATCH", "PARAMEDIC", "DOCTOR", "RECEIVER_MD", "AUDITOR")

    frap = _ensure_frap(db, company_id, frap_id)

    # 1) events persistidos
    ev_rows = (
        db.query(FrapEvent)
        .filter(FrapEvent.company_id == company_id, FrapEvent.frap_id == frap_id)
        .order_by(FrapEvent.ts.asc())
        .all()
    )

    items: list[dict[str, Any]] = [
        {"ts": r.ts, "type": r.type, "data": (r.data or {})}
        for r in ev_rows
    ]

    # 2) status derivado del Service
    svc = db.query(Service).filter(Service.id == frap.service_id, Service.company_id == company_id).first()
    if svc:
        items.extend(_service_status_items(svc))

    # Orden final
    items.sort(key=lambda x: x["ts"])

    return [TimelineItemOut(ts=i["ts"], type=i["type"], data=i["data"]) for i in items]
