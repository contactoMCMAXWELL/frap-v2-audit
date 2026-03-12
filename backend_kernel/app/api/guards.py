# app/api/guards.py
from __future__ import annotations

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.frap import Frap


def _get_company_id_from_headers(request: Request) -> str | None:
    # Ajusta si tu header se llama distinto
    return request.headers.get("X-Company-Id")


def get_frap_or_404(
    frap_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> Frap:
    frap = db.query(Frap).filter(Frap.id == frap_id).first()
    if not frap:
        raise HTTPException(status_code=404, detail="FRAP not found")

    # En multi-empresa, SIEMPRE valida compañía por header
    company_id = _get_company_id_from_headers(request)
    if company_id and str(frap.company_id) != str(company_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    return frap


def ensure_frap_not_locked(
    frap: Frap = Depends(get_frap_or_404),
) -> Frap:
    if frap.locked_at is not None:
        raise HTTPException(status_code=409, detail="FRAP is locked")
    return frap
