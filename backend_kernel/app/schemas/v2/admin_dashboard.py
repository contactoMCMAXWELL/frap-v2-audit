from __future__ import annotations

from typing import List

from pydantic import BaseModel


class KpiCard(BaseModel):
    key: str
    label: str
    value: float | int
    formatted: str = ""
    tone: str = "default"
    hint: str = ""


class ChartPoint(BaseModel):
    label: str
    value: float | int


class TimeseriesPoint(BaseModel):
    date: str
    services: int = 0
    sale_price: float = 0
    total_cost: float = 0
    margin_amount: float = 0
    ready_for_pdf: int = 0
    billed: int = 0
    paid: int = 0


class NamedMetric(BaseModel):
    label: str
    count: int = 0
    amount: float = 0
    extra: float = 0


class AdminDashboardSummaryOut(BaseModel):
    start_date: str
    end_date: str
    company_scope: str
    kpis: List[KpiCard]


class AdminDashboardOperationsOut(BaseModel):
    start_date: str
    end_date: str
    services_by_type: List[ChartPoint]
    services_by_priority: List[ChartPoint]
    top_units: List[NamedMetric]
    top_destinations: List[NamedMetric]


class AdminDashboardClinicalOut(BaseModel):
    start_date: str
    end_date: str
    closure_breakdown: List[ChartPoint]
    top_procedures: List[NamedMetric]
    top_medications: List[NamedMetric]


class AdminDashboardDocumentalOut(BaseModel):
    start_date: str
    end_date: str
    ready_for_pdf: int
    pending_for_pdf: int
    with_inconsistency: int
    missing_signatures_breakdown: List[ChartPoint]
    case_type_breakdown: List[ChartPoint]


class AdminDashboardFinancialOut(BaseModel):
    start_date: str
    end_date: str
    totals: List[KpiCard]
    by_billing_status: List[NamedMetric]
    by_payer_type: List[NamedMetric]
    by_service_type: List[NamedMetric]
    by_unit: List[NamedMetric]


class AdminDashboardTimeseriesOut(BaseModel):
    start_date: str
    end_date: str
    granularity: str = "day"
    points: List[TimeseriesPoint]
