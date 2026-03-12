# app/services/frap_events.py
from __future__ import annotations

from typing import Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.frap_event import FrapEvent


def log_frap_event(
    db: Session,
    *,
    company_id: UUID,
    frap_id: UUID,
    event_type: str,
    data: Optional[dict[str, Any]] = None,
    created_by: Optional[UUID] = None,
) -> FrapEvent:
    ev = FrapEvent(
        company_id=company_id,
        frap_id=frap_id,
        type=event_type,
        data=data or {},
        created_by=created_by,
    )
    db.add(ev)
    db.flush()  # asegura id/ts si los necesitas de inmediato
    return ev
