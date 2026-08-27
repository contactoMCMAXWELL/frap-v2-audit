from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CompanyPdfConfigBase(BaseModel):
    include_legal_legend: bool = True
    legal_legend_text: str | None = None

    include_signature_legend: bool = True
    signature_legend_text: str | None = None

    include_footer_legend: bool = True
    footer_legend_text: str | None = None

    include_privacy_notice: bool = False
    privacy_notice_text: str | None = None

    include_insurance_legend: bool = False
    insurance_legend_text: str | None = None


class CompanyPdfConfigUpsert(CompanyPdfConfigBase):
    pass


class CompanyPdfConfigOut(CompanyPdfConfigBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    created_at: datetime
    updated_at: datetime