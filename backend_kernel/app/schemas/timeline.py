from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel
from uuid import UUID


class TimelineItem(BaseModel):
    ts: datetime
    type: str
    data: Dict[str, Any] = {}


class TimelineOut(BaseModel):
    frap_id: UUID
    service_id: UUID
    items: list[TimelineItem]
