from __future__ import annotations

from typing import List, Optional
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.signature import Signature
from app.models.frap import Frap

router = APIRouter(tags=["frap_signatures"])

REQUIRED_ROLES = {"responsable", "tripulacion", "receptor"}


def _require_uuid(name: str, value: Optional[str]) -> uuid.UUID:
    if not value:
        raise HTTPException(status_code=400, detail=f"Missing header {name}")
    try:
        return uuid.UUID(value)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid UUID in header {name}")


class SignatureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    frap_id: uuid.UUID
    company_id: uuid.UUID
    role: str
    image_base64: str
    signer_name: Optional[str] = None
    device_id: Optional[str] = None
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    geo_accuracy_m: Optional[float] = None
    signed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class SignatureIn(BaseModel):
    role: str
    image_base64: str
    signer_name: Optional[str] = None
    device_id: Optional[str] = None
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    geo_accuracy_m: Optional[float] = None


@router.get("/{frap_id}/signatures", response_model=List[SignatureOut])
def list_frap_signatures(
    frap_id: uuid.UUID,
    db: Session = Depends(get_db),
    x_company_id: Optional[str] = Header(default=None, alias="X-Company-Id"),
):
    company_id = _require_uuid("X-Company-Id", x_company_id)

    frap = db.query(Frap).filter(Frap.id == frap_id, Frap.company_id == company_id).first()
    if not frap:
        raise HTTPException(status_code=404, detail="FRAP not found")

    sigs = (
        db.query(Signature)
        .filter(Signature.frap_id == frap_id, Signature.company_id == company_id)
        .order_by(Signature.signed_at.asc())
        .all()
    )
    return sigs


@router.post("/{frap_id}/signatures", response_model=SignatureOut)
def upsert_frap_signature(
    frap_id: uuid.UUID,
    payload: SignatureIn,
    db: Session = Depends(get_db),
    x_company_id: Optional[str] = Header(default=None, alias="X-Company-Id"),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    _ = _require_uuid("X-User-Id", x_user_id)
    company_id = _require_uuid("X-Company-Id", x_company_id)

    role = (payload.role or "").strip().lower()
    if role not in REQUIRED_ROLES:
        raise HTTPException(status_code=400, detail={"message": "Invalid role", "allowed": sorted(REQUIRED_ROLES)})

    frap = db.query(Frap).filter(Frap.id == frap_id, Frap.company_id == company_id).first()
    if not frap:
        raise HTTPException(status_code=404, detail="FRAP not found")

    if frap.locked_at is not None:
        raise HTTPException(status_code=409, detail="FRAP is locked; signatures cannot be modified")

    sig = (
        db.query(Signature)
        .filter(Signature.frap_id == frap_id, Signature.company_id == company_id, Signature.role == role)
        .first()
    )

    if sig is None:
        sig = Signature(
            frap_id=frap_id,
            company_id=company_id,
            role=role,
            image_base64=payload.image_base64,
            signer_name=payload.signer_name,
            device_id=payload.device_id,
            geo_lat=payload.geo_lat,
            geo_lng=payload.geo_lng,
            geo_accuracy_m=payload.geo_accuracy_m,
        )
    else:
        sig.image_base64 = payload.image_base64
        sig.signer_name = payload.signer_name
        sig.device_id = payload.device_id
        sig.geo_lat = payload.geo_lat
        sig.geo_lng = payload.geo_lng
        sig.geo_accuracy_m = payload.geo_accuracy_m

    db.add(sig)
    db.commit()
    db.refresh(sig)
    return sig