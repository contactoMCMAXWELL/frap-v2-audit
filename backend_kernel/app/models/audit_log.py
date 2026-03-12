from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base
from app.models.common import uuid_pk, created_at_col

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = uuid_pk()
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)

    entity = Column(String(30), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(String(30), nullable=False)

    actor_user_id = Column(UUID(as_uuid=True), nullable=True)
    meta = Column(JSONB, nullable=False, default=dict)
    created_at = created_at_col()
