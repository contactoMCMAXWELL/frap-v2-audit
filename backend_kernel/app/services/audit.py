from sqlalchemy.orm import Session
from uuid import UUID
from app.models.audit_log import AuditLog

def audit(db: Session, company_id: UUID, entity: str, entity_id: UUID, action: str, meta: dict, actor_user_id=None):
    row = AuditLog(
        company_id=company_id,
        entity=entity,
        entity_id=entity_id,
        action=action,
        actor_user_id=actor_user_id,
        meta=meta or {},
    )
    db.add(row)
