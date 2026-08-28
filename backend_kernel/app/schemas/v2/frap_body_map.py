from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FrapBodyMapV2Base(BaseModel):
    status: str | None = None
    anterior_regions: list[Any] | None = None
    posterior_regions: list[Any] | None = None
    injuries: list[Any] | None = None
    summary: str | None = None
    notes: str | None = None


class FrapBodyMapV2Upsert(FrapBodyMapV2Base):
    assessed_at: Optional[datetime] = None


class FrapBodyMapV2Out(FrapBodyMapV2Base):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    intake_id: UUID
    assessed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime