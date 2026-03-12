# app/schemas/frap.py
from __future__ import annotations

from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class FrapOut(BaseModel):
    id: UUID
    company_id: UUID
    service_id: UUID
    folio: str
    data: Dict[str, Any] = Field(default_factory=dict)

    # lock/legal fields (para que UI pueda ver LOCKED + hash)
    locked_at: Optional[Any] = None
    hash_final: Optional[str] = None

    class Config:
        from_attributes = True


class FrapServiceSection(BaseModel):
    service_type: str = Field(..., min_length=1, max_length=50)
    priority: int = Field(..., ge=1, le=5)

    location: str | None = Field(default=None, max_length=80)
    motive: str | None = Field(default=None, max_length=80)
    requested_by: str | None = Field(default=None, max_length=80)