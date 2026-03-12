from __future__ import annotations

from typing import Optional, List
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.rbac import require_roles

router = APIRouter(prefix="/api/admin", tags=["admin"])

# --- Pydantic schemas ---
class CompanyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    code: str = Field(min_length=2, max_length=30, description="Tenant code/slug, unique")

class CompanyOut(BaseModel):
    id: str
    name: str
    code: str
    active: bool
    created_at: str


def _ensure_companies_table(db: Session) -> None:
    """
    Fast-track: crea tabla si no existe.
    En producción, esto debería ir en Alembic migration.
    """
    db.execute(text("""
    CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        code VARCHAR(30) NOT NULL UNIQUE,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """))
    db.commit()


@router.post(
    "/companies",
    status_code=status.HTTP_201_CREATED,
    response_model=CompanyOut,
    dependencies=[Depends(require_roles("SUPERADMIN"))],
)
def create_company(payload: CompanyCreate, db: Session = Depends(get_db)):
    _ensure_companies_table(db)

    # unique code
    exists = db.execute(text("SELECT 1 FROM companies WHERE code = :code LIMIT 1"), {"code": payload.code}).first()
    if exists:
        raise HTTPException(status_code=409, detail="Company code already exists")

    company_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()

    db.execute(
        text("""
        INSERT INTO companies (id, name, code, active, created_at)
        VALUES (:id, :name, :code, TRUE, NOW())
        """),
        {"id": company_id, "name": payload.name, "code": payload.code},
    )
    db.commit()

    return CompanyOut(id=company_id, name=payload.name, code=payload.code, active=True, created_at=now)


@router.get(
    "/companies",
    response_model=List[CompanyOut],
    dependencies=[Depends(require_roles("SUPERADMIN"))],
)
def list_companies(db: Session = Depends(get_db)):
    _ensure_companies_table(db)

    rows = db.execute(
        text("SELECT id::text, name, code, active, created_at::text FROM companies ORDER BY created_at DESC")
    ).fetchall()

    return [
        CompanyOut(
            id=r[0],
            name=r[1],
            code=r[2],
            active=bool(r[3]),
            created_at=r[4],
        )
        for r in rows
    ]