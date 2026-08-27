from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.schemas.v2.admin_dashboard import (
    AdminDashboardClinicalOut,
    AdminDashboardDocumentalOut,
    AdminDashboardFinancialOut,
    AdminDashboardOperationsOut,
    AdminDashboardSummaryOut,
    AdminDashboardTimeseriesOut,
)
from app.services.admin_dashboard_service import (
    ensure_admin_access,
    get_clinical,
    get_documental,
    get_financial,
    get_operations,
    get_summary,
    get_timeseries,
)

router = APIRouter(prefix="/v2/admin-dashboard", tags=["v2-admin-dashboard"])


@router.get("/summary", response_model=AdminDashboardSummaryOut)
def admin_dashboard_summary(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: UUID = Depends(get_company_id),
):
    ensure_admin_access(user)
    return get_summary(db, company_id, start_date, end_date)


@router.get("/operations", response_model=AdminDashboardOperationsOut)
def admin_dashboard_operations(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: UUID = Depends(get_company_id),
):
    ensure_admin_access(user)
    return get_operations(db, company_id, start_date, end_date)


@router.get("/clinical", response_model=AdminDashboardClinicalOut)
def admin_dashboard_clinical(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: UUID = Depends(get_company_id),
):
    ensure_admin_access(user)
    return get_clinical(db, company_id, start_date, end_date)


@router.get("/documental", response_model=AdminDashboardDocumentalOut)
def admin_dashboard_documental(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: UUID = Depends(get_company_id),
):
    ensure_admin_access(user)
    return get_documental(db, company_id, start_date, end_date)


@router.get("/financial", response_model=AdminDashboardFinancialOut)
def admin_dashboard_financial(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: UUID = Depends(get_company_id),
):
    ensure_admin_access(user)
    return get_financial(db, company_id, start_date, end_date)


@router.get("/timeseries", response_model=AdminDashboardTimeseriesOut)
def admin_dashboard_timeseries(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: UUID = Depends(get_company_id),
):
    ensure_admin_access(user)
    return get_timeseries(db, company_id, start_date, end_date)
