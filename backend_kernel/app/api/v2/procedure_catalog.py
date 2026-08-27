from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.procedure_catalog import ProcedureCatalog
from app.schemas.v2.procedure_catalog import (
    ProcedureCatalogCreate,
    ProcedureCatalogOut,
    ProcedureCatalogPatch,
)

router = APIRouter(prefix="/v2/procedure-catalog", tags=["v2-procedure-catalog"])


@router.get("/", response_model=List[ProcedureCatalogOut])
def list_procedures(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    return (
        db.query(ProcedureCatalog)
        .filter(ProcedureCatalog.company_id == company_id)
        .order_by(ProcedureCatalog.name.asc())
        .all()
    )


@router.post("/", response_model=ProcedureCatalogOut, status_code=201)
def create_procedure(
    payload: ProcedureCatalogCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Procedure name is required",
        )

    row = ProcedureCatalog(
        company_id=company_id,
        name=name,
        category=(payload.category or "").strip(),
        notes=(payload.notes or "").strip(),
        active=bool(payload.active),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{procedure_id}", response_model=ProcedureCatalogOut)
def patch_procedure(
    procedure_id: uuid.UUID,
    payload: ProcedureCatalogPatch,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    row = (
        db.query(ProcedureCatalog)
        .filter(
            ProcedureCatalog.id == procedure_id,
            ProcedureCatalog.company_id == company_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Procedure not found")

    data = payload.model_dump(exclude_unset=True)

    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Procedure name is required")
        row.name = name

    if "category" in data:
        row.category = (data["category"] or "").strip()

    if "notes" in data:
        row.notes = (data["notes"] or "").strip()

    if "active" in data and data["active"] is not None:
        row.active = bool(data["active"])

    db.add(row)
    db.commit()
    db.refresh(row)
    return row