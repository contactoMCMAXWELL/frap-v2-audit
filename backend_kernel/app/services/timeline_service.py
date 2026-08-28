from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.service_dispatch_event_v2 import ServiceDispatchEventV2


def create_dispatch_event(
    db: Session,
    company_id,
    intake_id,
    event_type: str,
    status_label: str,
    payload: dict | None = None,
    occurred_at=None,
):
    """
    Registra un evento en el timeline operativo/clínico del servicio.
    """

    event = ServiceDispatchEventV2(
        company_id=company_id,
        intake_id=intake_id,
        event_type=event_type,
        status_label=status_label,
        event_payload=payload or {},
        occurred_at=occurred_at,
    )

    db.add(event)
    db.commit()