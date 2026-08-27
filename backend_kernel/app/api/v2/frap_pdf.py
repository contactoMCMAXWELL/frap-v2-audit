from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.pdf.frap_pdf_renderer import render_frap_pdf_bytes, render_frap_pdf_html
from app.schemas.v2.frap_pdf import FrapPdfPayloadOut
from app.services.frap_pdf_payload import build_frap_pdf_payload
from app.services.license_guard import require_company_feature

router = APIRouter(prefix="/v2/frap-pdf", tags=["v2-frap-pdf"])

ALLOWED_ROLES = {
    "SUPERADMIN",
    "ADMIN",
    "DISPATCH",
    "PARAMEDIC",
    "DOCTOR",
    "RECEIVER_MD",
    "AUDITOR",
}


def _require_role(user) -> None:
    role = str(getattr(user, "role", "") or "").upper()
    if role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="No autorizado")


@router.get("/{intake_id}/payload", response_model=FrapPdfPayloadOut)
def get_frap_pdf_payload(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "clinical")
    _require_role(user)

    try:
        return build_frap_pdf_payload(db, company_id, intake_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{intake_id}/html", response_class=HTMLResponse)
def preview_frap_pdf_html(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "clinical")
    _require_role(user)

    try:
        payload = build_frap_pdf_payload(db, company_id, intake_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    html = render_frap_pdf_html(payload)
    return HTMLResponse(content=html)


@router.get("/{intake_id}/render")
def render_frap_pdf(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    require_company_feature(db, company_id, "clinical")
    _require_role(user)

    try:
        payload = build_frap_pdf_payload(db, company_id, intake_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    if not payload.get("ready_for_pdf"):
        raise HTTPException(
            status_code=409,
            detail={
                "message": "El caso no está listo para generar PDF",
                "validation": payload.get("validation", {}),
            },
        )

    try:
        pdf_bytes = render_frap_pdf_bytes(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al generar PDF: {exc}")

    filename = f"frap_medico_legal_{intake_id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"'
        },
    )