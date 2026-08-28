from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class FrapProcedureV2Base(BaseModel):
    procedure_name: str
    status: str = "performed"
    body_site: str = ""
    successful: bool = True
    notes: str = ""


class FrapProcedureV2Create(FrapProcedureV2Base):
    intake_id: UUID
    performed_at: Optional[datetime] = None


class FrapProcedureV2Out(FrapProcedureV2Base):
    id: UUID
    company_id: UUID
    intake_id: UUID
    performed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True