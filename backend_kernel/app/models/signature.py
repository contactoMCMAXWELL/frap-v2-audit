from sqlalchemy import Column, String, ForeignKey, Float, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base
from app.models.common import uuid_pk, created_at_col

class Signature(Base):
    __tablename__ = "signatures"
    __table_args__ = (
        UniqueConstraint("frap_id", "role", name="uq_signature_frap_role"),
    )

    id = uuid_pk()
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    frap_id = Column(UUID(as_uuid=True), ForeignKey("fraps.id", ondelete="CASCADE"), nullable=False)

    role = Column(String(30), nullable=False)
    image_base64 = Column(String, nullable=False)

    signer_name = Column(String(120), nullable=True)
    device_id = Column(String(120), nullable=True)

    geo_lat = Column(Float, nullable=True)
    geo_lng = Column(Float, nullable=True)
    geo_accuracy_m = Column(Float, nullable=True)

    signed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = created_at_col()
