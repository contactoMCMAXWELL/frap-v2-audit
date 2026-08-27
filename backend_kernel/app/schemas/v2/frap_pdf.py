from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FrapPdfPayloadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    intake_id: UUID
    company_id: UUID

    ready_for_pdf: bool
    case_type: str
    validation: dict[str, Any]

    generated_at: datetime

    company: dict[str, Any]
    pdf_config: dict[str, Any]

    service: dict[str, Any]
    patient: dict[str, Any]

    clinical_summary: dict[str, Any]
    sections: dict[str, Any]

    timeline: list[dict[str, Any]]
    signatures: list[dict[str, Any]]

    legal_blocks: list[dict[str, str]]