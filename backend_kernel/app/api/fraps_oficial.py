from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.models.frap import Frap
from app.models.signature import Signature
from app.services.tenant import get_company_id
from app.pdf.frap_oficial import generate_pdf_oficial

router = APIRouter(prefix="/fraps", tags=["fraps-oficial"])

TEMPLATE_PATH = "/app/assets/frap_template_base.pdf"
COMPANY_BRAND_NAME = "MC-MAXWELL"

@router.get("/{frap_id}/pdf/oficial")
def pdf_oficial(frap_id: UUID, company_id: UUID = Depends(get_company_id), db: Session = Depends(get_db)):
    frap = db.query(Frap).filter(Frap.id == frap_id, Frap.company_id == company_id).first()
    if not frap:
        raise HTTPException(status_code=404, detail="FRAP not found")

    sigs = db.query(Signature).filter(Signature.company_id == company_id, Signature.frap_id == frap_id).all()
    by_role = {s.role: s for s in sigs}

    pdf_bytes = generate_pdf_oficial(
        template_pdf_path=TEMPLATE_PATH,
        folio=frap.folio,
        company_name=COMPANY_BRAND_NAME,
        locked_at=frap.locked_at,
        hash_final=frap.hash_final,
        frap_data=frap.data or {},
        signatures_by_role=by_role,
    )

    return Response(content=pdf_bytes, media_type="application/pdf")
