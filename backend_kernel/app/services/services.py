from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.service import Service
from app.models.frap import Frap
from app.schemas.service import ServiceCreate, ServiceOut


def _now():
    return datetime.now(timezone.utc)


STATUS_TS_FIELD = {
    "assigned": "assigned_at",
    "accepted": "accepted_at",
    "en_route": "en_route_at",
    "on_scene": "on_scene_at",
    "transport": "transport_at",
    "delivered": "delivered_at",
    "closed": "closed_at",
    "finished": "finished_at",
}


def list_services(db: Session, company_id: UUID, limit: int = 100):
    limit = max(1, min(int(limit or 100), 500))
    rows = (
        db.query(Service, Frap)
        .outerjoin(Frap, (Frap.service_id == Service.id) & (Frap.company_id == company_id))
        .filter(Service.company_id == company_id)
        .order_by(Service.created_at.desc())
        .limit(limit)
        .all()
    )
    out: list[ServiceOut] = []
    for svc, frap in rows:
        base = ServiceOut.model_validate(svc, from_attributes=True)
        payload = base.model_dump()
        payload["frap_id"] = (frap.id if frap else None)
        payload["frap_folio"] = (frap.folio if frap else None)
        out.append(ServiceOut(**payload))
    return out


def create_service(db: Session, company_id: UUID, created_by: UUID, payload: ServiceCreate):
    svc = Service(
        company_id=company_id,
        priority=payload.priority,
        service_type=payload.service_type,
        location=payload.location,
        motive=payload.motive,
        requested_by=payload.requested_by,
        status=(payload.status or "draft"),
    )
    if hasattr(svc, "created_by"):
        setattr(svc, "created_by", created_by)
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc


def update_service_status(db: Session, company_id: UUID, service_id: str, status_to: str, actor_id: UUID):
    to_status = (status_to or "").strip()
    if not to_status:
        raise HTTPException(status_code=422, detail="status_to requerido")

    try:
        sid = UUID(service_id)
    except Exception:
        raise HTTPException(status_code=422, detail="service_id inválido")

    svc = db.query(Service).filter(Service.id == sid, Service.company_id == company_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    svc.status = to_status
    field = STATUS_TS_FIELD.get(to_status)
    if field and getattr(svc, field, None) is None:
        setattr(svc, field, _now())

    if hasattr(svc, "updated_by"):
        setattr(svc, "updated_by", actor_id)

    db.commit()
    db.refresh(svc)
    return svc
