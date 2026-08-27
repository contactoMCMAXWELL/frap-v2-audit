from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.frap import Frap
from app.models.frap_event import FrapEvent
from app.services.tenant import get_company_id
from app.services.audit import audit

# Actor + roles (compatible con tu proyecto: puede vivir en app.services.authz o app.api.authz)
try:
    from app.services.authz import get_actor, require_roles
except Exception:  # pragma: no cover
    from app.api.authz import get_actor, require_roles  # type: ignore

router = APIRouter()


class EventIn(BaseModel):
    type: str = Field(..., max_length=50)
    data: dict[str, Any] = Field(default_factory=dict)
    ts: Optional[datetime] = None


class EventOut(BaseModel):
    id: UUID
    frap_id: UUID
    type: str
    data: dict[str, Any]
    ts: datetime
    created_at: datetime

    class Config:
        from_attributes = True


def _get_frap_or_404(db: Session, company_id: UUID, frap_id: UUID) -> Frap:
    frap = db.query(Frap).filter(Frap.id == frap_id, Frap.company_id == company_id).first()
    if not frap:
        raise HTTPException(status_code=404, detail="FRAP not found")
    return frap


def _assert_not_locked(frap: Frap) -> None:
    if getattr(frap, "locked_at", None) is not None:
        raise HTTPException(status_code=409, detail="FRAP is locked")


@router.get("/{frap_id}/events", response_model=list[EventOut])
def list_events(
    frap_id: UUID,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    # Read: ADMIN, DISPATCH, PARAMEDIC, DOCTOR, RECEIVER_MD, AUDITOR
    require_roles(actor, "ADMIN", "DISPATCH", "PARAMEDIC", "DOCTOR", "RECEIVER_MD", "AUDITOR")
    _get_frap_or_404(db, company_id, frap_id)

    items = (
        db.query(FrapEvent)
        .filter(FrapEvent.company_id == company_id, FrapEvent.frap_id == frap_id)
        .order_by(FrapEvent.ts.asc(), FrapEvent.created_at.asc())
        .all()
    )
    return items


@router.post("/{frap_id}/events", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    frap_id: UUID,
    payload: EventIn,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    # Write: ADMIN, DISPATCH, PARAMEDIC
    require_roles(actor, "ADMIN", "DISPATCH", "PARAMEDIC")
    frap = _get_frap_or_404(db, company_id, frap_id)
    _assert_not_locked(frap)

    ev = FrapEvent(
        company_id=company_id,
        frap_id=frap_id,
        type=payload.type,
        data=payload.data or {},
        created_by=getattr(actor, "user_id", None),
        ts=payload.ts or datetime.utcnow(),
    )
    db.add(ev)
    db.flush()

    audit(
        db,
        company_id,
        "frap_event",
        ev.id,
        "create",
        {"frap_id": str(frap_id), "type": payload.type},
    )
    db.commit()
    db.refresh(ev)
    return ev


@router.delete("/{frap_id}/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    frap_id: UUID,
    event_id: UUID,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    # Delete: ADMIN only
    require_roles(actor, "ADMIN")
    frap = _get_frap_or_404(db, company_id, frap_id)
    _assert_not_locked(frap)

    ev = (
        db.query(FrapEvent)
        .filter(FrapEvent.company_id == company_id, FrapEvent.frap_id == frap_id, FrapEvent.id == event_id)
        .first()
    )
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(ev)
    audit(db, company_id, "frap_event", ev.id, "delete", {"frap_id": str(frap_id)})
    db.commit()
    return None