from __future__ import annotations

from uuid import UUID
from sqlalchemy.orm import Session

from app.models.unit import Unit


def list_units(db: Session, company_id: UUID):
    return (
        db.query(Unit)
        .filter(Unit.company_id == company_id)
        .order_by(Unit.created_at.desc())
        .all()
    )


# Compatibility extras (optional)
try:
    from fastapi import HTTPException
except Exception:  # pragma: no cover
    HTTPException = Exception  # type: ignore

def get_unit(db: Session, company_id: UUID, unit_id: str):
    q = db.query(Unit).filter(Unit.company_id == company_id, Unit.id == unit_id)
    obj = q.first()
    if not obj:
        raise HTTPException(status_code=404, detail="Unit not found")
    return obj

def create_unit(db: Session, company_id: UUID, payload: Any, actor_id: UUID | None = None):
    # Best-effort create using dict-like payload; avoids hard dependency on schemas
    data = payload if isinstance(payload, dict) else getattr(payload, "model_dump", lambda **k: {})()
    obj = Unit(**{k:v for k,v in data.items() if hasattr(Unit, k)})
    if hasattr(obj, "company_id"):
        setattr(obj, "company_id", company_id)
    if actor_id and hasattr(obj, "created_by"):
        setattr(obj, "created_by", actor_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
