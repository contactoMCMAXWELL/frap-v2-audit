from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import created_at_col, uuid_pk


class FrapProcedureV2(Base):
    __tablename__ = "frap_procedures_v2"

    id = uuid_pk()

    company_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    intake_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("service_intake_v2.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    procedure_name: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="performed")
    body_site: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    successful: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")

    created_at = created_at_col()