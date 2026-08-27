from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.company import Company

router = APIRouter(prefix="/v2/session", tags=["v2-session"])


@router.get("/context")
def get_session_context(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id=Depends(get_company_id),
):
    company = db.query(Company).filter(Company.id == company_id).first()

    return {
        "user": {
            "id": str(getattr(user, "id", "") or ""),
            "name": getattr(user, "name", "") or "",
            "email": getattr(user, "email", "") or "",
            "role": str(getattr(user, "role", "") or "").upper(),
        },
        "company": {
            "id": str(company.id) if company else str(company_id),
            "name": getattr(company, "name", "") if company else "",
            "code": getattr(company, "code", "") if company else "",
            "logo_url": getattr(company, "logo_url", "") if company else "",
            "active": bool(getattr(company, "active", True)) if company else True,
        },
    }