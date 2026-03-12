from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.services.tenant import get_company_id

# Role injection / ACL
from app.services.authz import get_actor, require_roles

# Model imports
try:
    from app.models.frap import Frap
except Exception as e:
    raise ImportError("Missing model: app.models.frap.Frap") from e

try:
    from app.models.signature import Signature
except Exception:
    try:
        from app.models.signatures import Signature  # fallback si tu repo usa plural
    except Exception as e:
        raise ImportError(
            "Missing model: app.models.signature.Signature (or app.models.signatures.Signature)"
        ) from e

# Schemas: algunos repos solo tienen SignatureOut (y usan dict/input libre).
# Para evitar que el API truene en import-time, hacemos fallback.
try:
    from app.schemas.signature import SignatureIn, SignatureOut
except Exception:
    from app.schemas.signature import SignatureOut  # type: ignore
    from pydantic import BaseModel
    from typing import Optional
    from datetime import datetime

    class SignatureIn(BaseModel):
        signer_name: Optional[str] = None
        image_base64: str
        device_id: Optional[str] = None
        geo_lat: Optional[float] = None
        geo_lng: Optional[float] = None
        geo_accuracy_m: Optional[float] = None
        signed_at: Optional[datetime] = None

# audit (si existe)
try:
    from app.services.audit import audit
except Exception:
    def audit(db: Session, company_id: UUID, entity: str, entity_id: str, action: str, payload: dict):
        return


router = APIRouter(prefix="/fraps", tags=["signatures"])


def _get_frap(db: Session, company_id: UUID, frap_id: UUID) -> Frap:
    frap = db.query(Frap).filter(Frap.id == frap_id, Frap.company_id == company_id).first()
    if not frap:
        raise HTTPException(status_code=404, detail="FRAP not found")
    return frap


def _upsert_signature(
    db: Session,
    company_id: UUID,
    frap_id: UUID,
    role: str,
    payload: SignatureIn,
) -> Signature:
    row = (
        db.query(Signature)
        .filter(
            Signature.company_id == company_id,
            Signature.frap_id == frap_id,
            Signature.role == role,
        )
        .first()
    )
    if not row:
        row = Signature(company_id=company_id, frap_id=frap_id, role=role)
        db.add(row)

    row.signer_name = payload.signer_name
    row.image_base64 = payload.image_base64
    row.device_id = payload.device_id
    row.geo_lat = payload.geo_lat
    row.geo_lng = payload.geo_lng
    row.geo_accuracy_m = payload.geo_accuracy_m
    row.signed_at = payload.signed_at  # puede ser None

    return row


@router.get("/{frap_id}/signatures", response_model=list[SignatureOut])
def list_signatures(
    frap_id: UUID,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    require_roles(actor, "ADMIN", "DISPATCH", "PARAMEDIC", "DOCTOR", "RECEIVER_MD", "AUDITOR")
    _get_frap(db, company_id, frap_id)

    rows = (
        db.query(Signature)
        .filter(Signature.company_id == company_id, Signature.frap_id == frap_id)
        .all()
    )
    return rows


@router.post("/{frap_id}/signatures/responsable", response_model=SignatureOut)
def sign_responsable(
    frap_id: UUID,
    payload: SignatureIn,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    require_roles(actor, "ADMIN", "PARAMEDIC")

    frap = _get_frap(db, company_id, frap_id)
    if getattr(frap, "locked_at", None) is not None:
        raise HTTPException(status_code=409, detail="FRAP is locked; cannot sign")

    row = _upsert_signature(db, company_id, frap_id, "responsable", payload)
    audit(db, company_id, "signature", str(frap_id), "upsert", {"role": "responsable"})
    db.commit()
    db.refresh(row)
    return row


@router.post("/{frap_id}/signatures/tripulacion", response_model=SignatureOut)
def sign_tripulacion(
    frap_id: UUID,
    payload: SignatureIn,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    require_roles(actor, "ADMIN", "PARAMEDIC")

    frap = _get_frap(db, company_id, frap_id)
    if getattr(frap, "locked_at", None) is not None:
        raise HTTPException(status_code=409, detail="FRAP is locked; cannot sign")

    row = _upsert_signature(db, company_id, frap_id, "tripulacion", payload)
    audit(db, company_id, "signature", str(frap_id), "upsert", {"role": "tripulacion"})
    db.commit()
    db.refresh(row)
    return row


@router.post("/{frap_id}/signatures/receptor", response_model=SignatureOut)
def sign_receptor(
    frap_id: UUID,
    payload: SignatureIn,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    require_roles(actor, "ADMIN", "DOCTOR", "RECEIVER_MD")

    frap = _get_frap(db, company_id, frap_id)
    if getattr(frap, "locked_at", None) is not None:
        raise HTTPException(status_code=409, detail="FRAP is locked; cannot sign")

    row = _upsert_signature(db, company_id, frap_id, "receptor", payload)
    audit(db, company_id, "signature", str(frap_id), "upsert", {"role": "receptor"})
    db.commit()
    db.refresh(row)
    return row
