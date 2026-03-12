import io
import base64
from typing import Optional, Dict, Any
from datetime import datetime
import hashlib

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.graphics.barcode import qr
from reportlab.graphics import renderPDF
from reportlab.graphics.shapes import Drawing

from PyPDF2 import PdfReader, PdfWriter

from app.pdf.frap_oficial_layout import (
    PAGE_W, PAGE_H,
    HEADER_Y_TOP, HEADER_Y_BOTTOM,
    FOLIO_X, FOLIO_Y, DATE_X, DATE_Y,
    BRAND_X, BRAND_Y,
    LOCK_LABEL_X, LOCK_LABEL_Y, HASH_X, HASH_Y,
    QR_X, QR_Y, QR_SIZE,
    SIG_BOX_W, SIG_BOX_H,
    SIG_RESP_X, SIG_TRIP_X, SIG_REC_X, SIG_Y, SIG_META_Y
)

def _draw_qr(c: canvas.Canvas, x: float, y: float, size: float, value: str):
    widget = qr.QrCodeWidget(value)
    bounds = widget.getBounds()
    w = bounds[2] - bounds[0]
    h = bounds[3] - bounds[1]
    d = Drawing(size, size, transform=[size / w, 0, 0, size / h, 0, 0])
    d.add(widget)
    renderPDF.draw(d, c, x, y)

def _img_reader_from_b64(b64: str) -> ImageReader:
    img_bytes = base64.b64decode(b64.encode("utf-8"))
    return ImageReader(io.BytesIO(img_bytes))

def _overlay_page1(*, folio: str, company_name: str, locked_at, hash_final, frap_data: Dict[str, Any]) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)

    # Cover original header area
    c.setFillColorRGB(1, 1, 1)
    c.rect(0, HEADER_Y_BOTTOM, PAGE_W, HEADER_Y_TOP - HEADER_Y_BOTTOM, stroke=0, fill=1)

    # Brand
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(BRAND_X, BRAND_Y, company_name)

    # Folio & Date
    c.setFont("Helvetica-Bold", 10)
    c.drawString(FOLIO_X, FOLIO_Y, f"FOLIO: {folio}")
    c.setFont("Helvetica", 9)
    c.drawString(DATE_X, DATE_Y, f"FECHA: {datetime.utcnow().date().isoformat()}")

    # Lock/hash/QR if locked
    if locked_at and hash_final:
        c.setFont("Helvetica-Bold", 9)
        c.drawString(LOCK_LABEL_X, LOCK_LABEL_Y, "DOCUMENTO BLOQUEADO")
        c.setFont("Helvetica", 8)
        c.drawString(HASH_X, HASH_Y, f"Hash: {hash_final}")
        _draw_qr(c, QR_X, QR_Y, QR_SIZE, f"{folio}|{hash_final}")

    # MVP mapping example (ajustable): datos del servicio en texto pequeño
    svc = (frap_data or {}).get("service", {})
    c.setFont("Helvetica", 8)
    c.drawString(60, 680, f"Tipo de servicio: {svc.get('service_type','')}")
    c.drawString(60, 668, f"Prioridad: {svc.get('priority','')}")
    c.drawString(60, 656, f"Lugar: {svc.get('location','')}")
    c.drawString(60, 644, f"Motivo: {svc.get('motive','')}")
    c.drawString(60, 632, f"Solicita: {svc.get('requested_by','')}")

    c.showPage()
    c.save()
    return buf.getvalue()

def _overlay_page2(*, folio: str, company_name: str, locked_at, hash_final, signatures_by_role: Dict[str, Any]) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)

    # Cover header area
    c.setFillColorRGB(1, 1, 1)
    c.rect(0, HEADER_Y_BOTTOM, PAGE_W, HEADER_Y_TOP - HEADER_Y_BOTTOM, stroke=0, fill=1)
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(BRAND_X, BRAND_Y, company_name)

    c.setFont("Helvetica-Bold", 10)
    c.drawString(FOLIO_X, FOLIO_Y, f"FOLIO: {folio}")

    if locked_at and hash_final:
        c.setFont("Helvetica", 8)
        c.drawString(LOCK_LABEL_X, LOCK_LABEL_Y, "DOCUMENTO BLOQUEADO")
        c.drawString(HASH_X, HASH_Y, f"Hash: {hash_final}")
        _draw_qr(c, QR_X, QR_Y, QR_SIZE, f"{folio}|{hash_final}")

    role_to_x = {"responsable": SIG_RESP_X, "tripulacion": SIG_TRIP_X, "receptor": SIG_REC_X}

    for role, x in role_to_x.items():
        sig = signatures_by_role.get(role)
        if not sig:
            continue
        try:
            img = _img_reader_from_b64(sig.image_base64)
            c.drawImage(img, x, SIG_Y, SIG_BOX_W, SIG_BOX_H, preserveAspectRatio=True, mask="auto")
            name = getattr(sig, "signer_name", "") or ""
            signed_at = getattr(sig, "signed_at", None)
            ts = signed_at.isoformat().replace("+00:00", "Z") if signed_at else ""
            c.setFont("Helvetica", 7)
            c.drawString(x, SIG_META_Y, f"{name} {ts}".strip())
        except Exception:
            pass

    c.showPage()
    c.save()
    return buf.getvalue()

def generate_pdf_oficial(
    *,
    template_pdf_path: str,
    folio: str,
    company_name: str,
    locked_at,
    hash_final,
    frap_data: Dict[str, Any],
    signatures_by_role: Dict[str, Any],
) -> bytes:
    tpl = PdfReader(template_pdf_path)
    if len(tpl.pages) < 2:
        raise ValueError("Template PDF must have at least 2 pages")

    ov1 = PdfReader(io.BytesIO(_overlay_page1(
        folio=folio, company_name=company_name, locked_at=locked_at, hash_final=hash_final, frap_data=frap_data
    )))
    ov2 = PdfReader(io.BytesIO(_overlay_page2(
        folio=folio, company_name=company_name, locked_at=locked_at, hash_final=hash_final, signatures_by_role=signatures_by_role
    )))

    out = PdfWriter()

    p1 = tpl.pages[0]
    p1.merge_page(ov1.pages[0])
    out.add_page(p1)

    p2 = tpl.pages[1]
    p2.merge_page(ov2.pages[0])
    out.add_page(p2)

    buf = io.BytesIO()
    out.write(buf)
    return buf.getvalue()
