# app/schemas/events.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

EventType = Literal["vitals", "med", "procedure", "note", "milestone", "status"]


class EventCreate(BaseModel):
    type: EventType
    ts: datetime  # ✅ antes te faltaba / o estaba como str en otra versión
    data: dict[str, Any] = Field(default_factory=dict)


class EventOut(BaseModel):
    id: UUID
    ts: datetime  # ✅ CAMBIO CLAVE: datetime (no string)
    type: str
    data: dict[str, Any] = Field(default_factory=dict)
    created_by: Optional[UUID] = None

    class Config:
        from_attributes = True
