from sqlalchemy import Column, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from app.models.common import uuid_pk, created_at_col

class ServiceAssignment(Base):
    __tablename__ = "service_assignments"

    id = uuid_pk()
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), nullable=False)
    unit_id = Column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="CASCADE"), nullable=False)

    assigned_at = Column(DateTime(timezone=True), nullable=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)

    created_at = created_at_col()
