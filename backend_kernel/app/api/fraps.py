# app/api/fraps.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Any, Optional
import io
import base64
import hashlib
import json
import textwrap

from app.db.session import get_db
from app.models.frap import Frap
from app.models.service import Service
from app.models.company import Company
from app.models.signature import Signature
from app.schemas.frap import FrapOut, FrapServiceSection
from app.schemas.sections import PatientSection, TransportSection
from app.schemas.lock import LockOut

from app.api.deps import get_company_id
from app.services.audit import audit
from app.services.folio import build_folio, current_year_utc, normalize_company_code
from app.services.hashdoc import compute_frap_hash, build_hash_payload
from app.services.authz import get_actor, require_roles

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.graphics.barcode import qr
from reportlab.graphics import renderPDF
from reportlab.graphics.shapes import Drawing

# Optional models (no rompen si faltan)
try:
    from app.models.frap_event import FrapEvent  # type: ignore
except Exception:
    FrapEvent = None  # type: ignore

try:
    from app.models.unit import Unit  # type: ignore
except Exception:
    Unit = None  # type: ignore

try:
    from app.models.user import User  # type: ignore
except Exception:
    User = None  # type: ignore


router = APIRouter()


# =========================
# Helpers
# =========================

def _isoz(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    return dt.isoformat().replace("+00:00", "Z")


def _fmt_local(dt: Optional[datetime]) -> str:
    """Formatea fecha/hora para PDF en hora local (America/Mexico_City).

    - Si el datetime viene con tzinfo (p.ej. UTC), se convierte a MX.
    - Si viene naive (sin tzinfo), se asume America/Mexico_City para coincidir con la UI.
    """
    if not dt:
        return ""
    try:
        if getattr(dt, "tzinfo", None) is None:
            # En este proyecto, los timestamps suelen guardarse en hora local sin tzinfo.
            # Para que el PDF coincida con la UI, asumimos America/Mexico_City cuando es naive.
            dt = dt.replace(tzinfo=ZoneInfo("America/Mexico_City"))  # type: ignore[call-arg]
        dt_mx = dt.astimezone(ZoneInfo("America/Mexico_City"))  # type: ignore[attr-defined]
        return dt_mx.strftime("%d/%m/%Y %H:%M:%S")
    except Exception:
        try:
            return str(dt)
        except Exception:
            return ""


def next_folio_seq(db: Session, company_code: str, year: int) -> int:
    prefix = f"FRAP-{normalize_company_code(company_code)}-{year}-"
    count = db.query(func.count(Frap.id)).filter(Frap.folio.like(prefix + "%")).scalar() or 0
    return count + 1


def _norm_role(s: str) -> str:
    return (s or "").strip().lower()


def _require_signatures(db: Session, company_id: UUID, frap_id: UUID):
    rows = db.query(Signature).filter(Signature.company_id == company_id, Signature.frap_id == frap_id).all()
    by_role = {_norm_role(r.role): r for r in rows}
    required = ["responsable", "tripulacion", "receptor"]
    missing = [r for r in required if r not in by_role]
    if missing:
        raise HTTPException(status_code=409, detail={"message": "Missing signatures", "missing": missing})
    return by_role


def _events_payload_for_hash(db: Session, company_id: UUID, frap_id: UUID):
    if FrapEvent is None:
        return []

    items = (
        db.query(FrapEvent)
        .filter(FrapEvent.company_id == company_id, FrapEvent.frap_id == frap_id)
        .order_by(FrapEvent.ts.asc(), FrapEvent.created_at.asc())
        .all()
    )

    out = []
    for e in items:
        out.append(
            {
                "id": str(getattr(e, "id", "")),
                "type": getattr(e, "type", None),
                "ts": getattr(e, "ts", None).isoformat().replace("+00:00", "Z") if getattr(e, "ts", None) else None,
                "created_at": getattr(e, "created_at", None).isoformat().replace("+00:00", "Z") if getattr(e, "created_at", None) else None,
                "created_by": str(getattr(e, "created_by", "")) if getattr(e, "created_by", None) else None,
                "data": getattr(e, "data", None) or {},
            }
        )
    return out


def _service_status_items(svc: Service) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    def add(ts: Any, to_status: str):
        if ts is None:
            return
        items.append({"ts": ts, "type": "status", "data": {"to_status": to_status}})

    add(getattr(svc, "created_at", None), "requested")
    add(getattr(svc, "assigned_at", None), "assigned")
    add(getattr(svc, "accepted_at", None), "accepted")
    add(getattr(svc, "en_route_at", None), "en_route")
    add(getattr(svc, "on_scene_at", None), "on_scene")
    add(getattr(svc, "transport_at", None), "transport")
    add(getattr(svc, "delivered_at", None), "delivered")
    add(getattr(svc, "closed_at", None), "closed")
    add(getattr(svc, "finished_at", None), "finished")

    items.sort(key=lambda x: x["ts"])
    return items


def _service_timeline_payload_for_hash(svc: Optional[Service]) -> list[dict[str, Any]]:
    if not svc:
        return []
    out: list[dict[str, Any]] = []
    for it in _service_status_items(svc):
        out.append(
            {
                "id": None,
                "type": it["type"],
                "ts": _isoz(it.get("ts")),
                "created_at": None,
                "created_by": None,
                "data": it.get("data") or {},
            }
        )
    return out


def _service_section_fallback(frap: Frap, svc: Optional[Service]) -> dict[str, Any]:
    service = (frap.data or {}).get("service", {}) or {}
    if service.get("service_type") or service.get("location") or service.get("requested_by"):
        return service
    if not svc:
        return service
    return {
        "service_type": getattr(svc, "service_type", "") or "",
        "priority": getattr(svc, "priority", "") or "",
        "location": getattr(svc, "location", "") or "",
        "motive": getattr(svc, "motive", "") or "",
        "requested_by": getattr(svc, "requested_by", "") or "",
    }


def _draw_qr(c: canvas.Canvas, x: float, y: float, size: float, value: str):
    widget = qr.QrCodeWidget(value)
    bounds = widget.getBounds()
    w = bounds[2] - bounds[0]
    h = bounds[3] - bounds[1]
    d = Drawing(size, size, transform=[size / w, 0, 0, size / h, 0, 0])
    d.add(widget)
    renderPDF.draw(d, c, x, y)


def _sig_image_reader(sig: Signature):
    img_bytes = base64.b64decode((sig.image_base64 or "").encode("utf-8"))
    return ImageReader(io.BytesIO(img_bytes))


def _json_compact(v: Any) -> str:
    try:
        return json.dumps(v, ensure_ascii=False, separators=(",", ":"), default=str)
    except Exception:
        return str(v)


# =========================
# Human-friendly formatting for PDF (no JSON, no English)
# =========================

_STATUS_ES = {
    "requested": "Solicitado",
    "assigned": "Asignado",
    "accepted": "Aceptado",
    "en_route": "En ruta",
    "on_scene": "En escena",
    "transport": "Traslado",
    "delivered": "Entregado",
    "closed": "Cerrado",
    "finished": "Finalizado",
}

_TYPE_ES = {
    "status": "Estatus",
    "procedure": "Procedimiento",
    "med": "Medicamento",
    "medication": "Medicamento",
    "note": "Nota clínica",
    "vitals": "Signos vitales",
    "injury": "Lesión",
    "map": "Lesión",
    "bodymap": "Lesión",
}


def _cap(s: Any) -> str:
    return str(s or "").strip()


def _fmt_kv(label: str, value: Any) -> str:
    v = value
    if v is None or v == "" or v == [] or v == {}:
        return ""
    if isinstance(v, (dict, list)):
        # evita JSON crudo: convertimos a string corto
        v = _json_compact(v)
    v = str(v)
    v = v.replace("{", "").replace("}", "").replace("[", "").replace("]", "")
    return f"{label}: {v}".strip()


def _event_title(row_type: str) -> str:
    t = (row_type or "").lower().strip()
    return _TYPE_ES.get(t, _cap(row_type) or "Evento")


def _event_detail(row_type: str, data: Any) -> list[str]:
    """
    Devuelve líneas humanas en español (sin k=v, sin JSON).
    """
    t = (row_type or "").lower().strip()
    if not isinstance(data, dict):
        s = _cap(data)
        return [s] if s else []

    def _injury_lines(d: dict[str, Any]) -> list[str]:
        """Formato defendible para Lesión (Mapa corporal), evitando JSON crudo."""
        kind = _cap(d.get("kind") or d.get("type") or "")
        view = _cap(d.get("view") or d.get("side") or "")
        severity = d.get("severity")
        injury_type = _cap(d.get("injury_type") or d.get("injury") or d.get("lesion") or "")
        region = _cap(d.get("region_label") or d.get("region") or d.get("zona") or "")
        region_id = _cap(d.get("region_id") or "")
        notes = _cap(d.get("notes") or d.get("note") or d.get("observations") or "")

        title = "Lesión (Mapa corporal)"
        if kind and kind.lower() != "injury":
            title = f"{title} - {kind}"

        lines: list[str] = [title]
        if region:
            lines.append(f"Zona: {region}")
        elif region_id:
            lines.append(f"Zona: {region_id}")
        if injury_type:
            lines.append(f"Tipo: {injury_type}")
        if view:
            lines.append(f"Vista: {view}")
        if severity not in (None, "", [], {}):
            lines.append(f"Severidad: {severity}")
        if notes:
            lines.append(f"Notas: {notes}")
        return [l for l in lines if l.strip()]

    # Status
    if t == "status":
        to_status = _cap(data.get("to_status") or data.get("status") or "")
        if to_status:
            return [f"Cambio de estatus a: {_STATUS_ES.get(to_status.lower(), to_status)}"]
        return ["Cambio de estatus"]

    # Procedimiento
    if t == "procedure":
        # En algunos flujos, el mapa corporal llega como type=procedure con kind=injury.
        kind0 = _cap(data.get("kind") or "")
        if kind0.lower() == "injury" or any(k in data for k in ("injury_type", "region_label", "region_id", "view", "severity")):
            return _injury_lines(data)

        name = _cap(data.get("name") or data.get("procedure_name") or "")
        code = _cap(data.get("code") or data.get("procedure_code") or "")
        kind = kind0
        notes = _cap(data.get("notes") or data.get("note") or data.get("observations") or "")
        line = "Procedimiento"
        if name and code:
            line = f"{name} ({code})"
        elif name:
            line = name
        elif code:
            line = f"Código {code}"
        if kind:
            line = f"{line} - {kind}"
        lines = [line]
        if notes:
            lines.append(f"Notas: {notes}")
        return [l for l in lines if l.strip()]

    # Medicamento
    if t in ("med", "medication"):
        name = _cap(data.get("name") or data.get("med_name") or data.get("drug") or "")
        dose = _cap(data.get("dose") or data.get("dosage") or "")
        route = _cap(data.get("route") or data.get("via") or "")
        units = _cap(data.get("units") or "")
        notes = _cap(data.get("notes") or data.get("note") or "")
        line = "Medicamento"
        if name:
            line = name
        if dose:
            line = f"{line} - Dosis: {dose}{(' ' + units) if units else ''}"
        if route:
            line = f"{line} - Vía: {route}"
        lines = [line]
        if notes:
            lines.append(f"Notas: {notes}")
        return [l for l in lines if l.strip()]

    # Signos vitales
    if t == "vitals":
        # Algunos clientes guardan los signos dentro de un sub-dict (p.ej. {"vitals": {...}}).
        # Unificamos para poder extraer TA/FC/FR/SpO2/Temp/Glucosa/Dolor de forma robusta.
        base = dict(data)
        nested = base.get("vitals") or base.get("signs") or base.get("signos")
        if isinstance(nested, dict):
            for kk, vv in nested.items():
                if kk not in base:
                    base[kk] = vv
        data = base
        def _unwrap(v: Any) -> Any:
            # algunos clientes guardan {value: X} o {val: X}
            if isinstance(v, dict):
                for kk in ("value", "val", "v"):
                    if kk in v and v[kk] not in (None, "", [], {}):
                        return v[kk]
            return v

        def _pick(*keys: str) -> Any:
            for k in keys:
                if k in data:
                    v = _unwrap(data.get(k))
                    if v not in (None, "", [], {}):
                        return v
            return None

        lines: list[str] = []

        avpu = _pick("avpu", "AVPU")
        if avpu is not None:
            s = _fmt_kv("AVPU", avpu)
            if s:
                lines.append(s)

        # Glasgow / GCS puede venir como dict con ocular/verbal/motor/total
        g = _pick("glasgow", "gcs", "GCS")
        if isinstance(g, dict):
            ocular = _unwrap(g.get("ocular") or g.get("eye"))
            verbal = _unwrap(g.get("verbal"))
            motor = _unwrap(g.get("motora") or g.get("motor"))
            total = _unwrap(g.get("total") or g.get("score"))
            parts = []
            if ocular not in (None, "", [], {}): parts.append(f"Ocular {ocular}")
            if verbal not in (None, "", [], {}): parts.append(f"Verbal {verbal}")
            if motor not in (None, "", [], {}): parts.append(f"Motora {motor}")
            if total not in (None, "", [], {}): parts.append(f"Total {total}")
            if parts:
                lines.append("Glasgow: " + ", ".join(parts))
        else:
            s = _fmt_kv("Glasgow", g)
            if s:
                lines.append(s)

        # TA: puede venir como "120/90" o como sys/dia separados
        bp = _pick("bp", "ta", "TA", "blood_pressure")
        if isinstance(bp, dict):
            sys = _unwrap(bp.get("sys") or bp.get("systolic") or bp.get("sistolica"))
            dia = _unwrap(bp.get("dia") or bp.get("diastolic") or bp.get("diastolica"))
            if sys not in (None, "", [], {}) and dia not in (None, "", [], {}):
                lines.append(f"TA: {sys}/{dia}")
            else:
                s = _fmt_kv("TA", bp)
                if s:
                    lines.append(s)
        else:
            sys = _pick("bp_sys", "ta_sys", "systolic", "sistolica", "bp_systolic")
            dia = _pick("bp_dia", "ta_dia", "diastolic", "diastolica", "bp_diastolic")
            if sys is not None and dia is not None:
                lines.append(f"TA: {_unwrap(sys)}/{_unwrap(dia)}")
            else:
                s = _fmt_kv("TA", bp)
                if s:
                    lines.append(s)

        def _add_num(label: str, *keys: str):
            v = _pick(*keys)
            s = _fmt_kv(label, v)
            if s:
                lines.append(s)

        _add_num("FC", "hr", "fc", "heart_rate")
        _add_num("FR", "rr", "fr", "resp_rate")
        _add_num("SpO2", "spo2", "SpO2", "o2sat", "o2_sat")
        _add_num("Temp", "temp", "temperature")
        _add_num("Glucosa", "glucose", "glu", "glucosa", "bg", "bgl", "glicemia", "glucemia", "capilar", "glucose_mgdl")
        _add_num("Dolor", "pain", "dolor", "pain_score", "eva", "vas", "nrs", "escala_dolor")

        # si no había nada conocido, imprime campos cortos
        if not lines:
            for k, v in list(data.items())[:8]:
                s = _fmt_kv(_cap(k), v)
                if s:
                    lines.append(s)
        return lines

    # Nota clínica
    if t == "note":
        txt = _cap(data.get("text") or data.get("note") or data.get("notes") or "")
        if txt:
            return [txt]
        # fallback corto
        lines = []
        for k, v in list(data.items())[:6]:
            s = _fmt_kv(_cap(k), v)
            if s:
                lines.append(s)
        return lines

    # Lesión / body map
    if t in ("injury", "map", "bodymap"):
        return _injury_lines(data)

    # Fallback genérico (sin JSON crudo)
    lines = []
    for k, v in list(data.items())[:8]:
        s = _fmt_kv(_cap(k), v)
        if s:
            lines.append(s)
    return lines


# =========================
# Routes
# =========================

@router.post("/from-service/{service_id}", response_model=FrapOut)
def create_from_service(
    service_id: UUID,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    require_roles(actor, "ADMIN", "DISPATCH", "PARAMEDIC")

    svc = db.query(Service).filter(Service.id == service_id, Service.company_id == company_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    existing = db.query(Frap).filter(Frap.service_id == service_id, Frap.company_id == company_id).first()
    if existing:
        return existing

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=400, detail="Invalid company_id (company does not exist)")

    company_code = (getattr(company, "code", None) or "").strip() or normalize_company_code(getattr(company, "name", ""))
    if not company_code:
        raise HTTPException(status_code=400, detail="Company code missing; set companies.code")

    if not (getattr(company, "code", "") or "").strip():
        company.code = company_code
        db.add(company)
        db.flush()

    year = current_year_utc()
    seq = next_folio_seq(db, company_code, year)
    folio = build_folio(company_code, year, seq)

    frap = Frap(company_id=company_id, service_id=service_id, folio=folio, data={})
    db.add(frap)
    db.flush()
    audit(db, company_id, "frap", frap.id, "create", {"service_id": str(service_id), "folio": folio})
    db.commit()
    db.refresh(frap)
    return frap


@router.get("/{frap_id}", response_model=FrapOut)
def get_frap(
    frap_id: UUID,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    require_roles(actor, "ADMIN", "DISPATCH", "PARAMEDIC", "DOCTOR", "RECEIVER_MD", "AUDITOR")

    frap = db.query(Frap).filter(Frap.id == frap_id, Frap.company_id == company_id).first()
    if not frap:
        raise HTTPException(status_code=404, detail="FRAP not found")
    return frap


@router.patch("/{frap_id}/sections/service", response_model=FrapOut)
def patch_service_section(
    frap_id: UUID,
    payload: FrapServiceSection,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    require_roles(actor, "ADMIN", "DISPATCH", "PARAMEDIC", "DOCTOR", "RECEIVER_MD", "AUDITOR")

    frap = db.query(Frap).filter(Frap.id == frap_id, Frap.company_id == company_id).first()
    if not frap:
        raise HTTPException(status_code=404, detail="FRAP not found")
    if frap.locked_at is not None:
        raise HTTPException(status_code=409, detail="FRAP is locked; cannot edit")

    data = frap.data or {}
    data["service"] = payload.model_dump()
    frap.data = data

    audit(db, company_id, "frap", frap.id, "update", {"section": "service"})
    db.commit()
    db.refresh(frap)
    return frap


@router.patch("/{frap_id}/sections/patient", response_model=FrapOut)
def patch_patient_section(
    frap_id: UUID,
    payload: PatientSection,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    require_roles(actor, "ADMIN", "DISPATCH", "PARAMEDIC", "DOCTOR", "RECEIVER_MD", "AUDITOR")

    frap = db.query(Frap).filter(Frap.id == frap_id, Frap.company_id == company_id).first()
    if not frap:
        raise HTTPException(status_code=404, detail="FRAP not found")
    if frap.locked_at is not None:
        raise HTTPException(status_code=409, detail="FRAP is locked; cannot edit")

    data = dict(frap.data or {})
    data["patient"] = payload.model_dump(exclude_none=True)
    frap.data = data

    audit(db, company_id, "frap", frap.id, "update", {"section": "patient"})
    db.commit()
    db.refresh(frap)
    return frap


@router.patch("/{frap_id}/sections/transport", response_model=FrapOut)
def patch_transport_section(
    frap_id: UUID,
    payload: TransportSection,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    require_roles(actor, "ADMIN", "DISPATCH", "PARAMEDIC", "DOCTOR", "RECEIVER_MD", "AUDITOR")

    frap = db.query(Frap).filter(Frap.id == frap_id, Frap.company_id == company_id).first()
    if not frap:
        raise HTTPException(status_code=404, detail="FRAP not found")
    if frap.locked_at is not None:
        raise HTTPException(status_code=409, detail="FRAP is locked; cannot edit")

    data = dict(frap.data or {})
    data["transport"] = payload.model_dump(exclude_none=True)
    frap.data = data

    audit(db, company_id, "frap", frap.id, "update", {"section": "transport"})
    db.commit()
    db.refresh(frap)
    return frap



@router.post("/{frap_id}/lock", response_model=LockOut)
def lock_frap(
    frap_id: UUID,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    require_roles(actor, "ADMIN", "PARAMEDIC")

    frap = db.query(Frap).filter(Frap.id == frap_id, Frap.company_id == company_id).first()
    if not frap:
        raise HTTPException(status_code=404, detail="FRAP not found")

    if frap.locked_at is not None:
        return LockOut(frap_id=frap.id, locked_at=frap.locked_at, hash_final=frap.hash_final or "")

    sigs = _require_signatures(db, company_id, frap_id)

    ordered_roles = ["responsable", "tripulacion", "receptor"]
    sig_payload = []
    for role in ordered_roles:
        s = sigs[role]
        sig_payload.append(
            {
                "role": role,
                "signer_name": s.signer_name,
                "device_id": s.device_id,
                "geo_lat": s.geo_lat,
                "geo_lng": s.geo_lng,
                "geo_accuracy_m": s.geo_accuracy_m,
                "signed_at": s.signed_at.isoformat().replace("+00:00", "Z") if s.signed_at else None,
                "image_sha256": hashlib.sha256((s.image_base64 or "").encode("utf-8")).hexdigest(),
            }
        )

    payload = build_hash_payload(folio=frap.folio, frap_data=frap.data or {}, signatures=sig_payload)

    svc = db.query(Service).filter(Service.id == frap.service_id, Service.company_id == company_id).first()
    frap_events = _events_payload_for_hash(db, company_id, frap_id)
    svc_timeline = _service_timeline_payload_for_hash(svc)

    merged = [*svc_timeline, *frap_events]
    merged.sort(key=lambda e: (e.get("ts") or "", e.get("created_at") or "", str(e.get("id") or "")))
    payload["events"] = merged

    h = compute_frap_hash(payload)

    from sqlalchemy.sql import func as sqlfunc
    frap.locked_at = sqlfunc.now()
    frap.hash_final = h

    audit(db, company_id, "frap", frap.id, "lock", {"hash_final": h})
    db.commit()
    db.refresh(frap)

    return LockOut(frap_id=frap.id, locked_at=frap.locked_at, hash_final=h)


@router.get("/{frap_id}/pdf")
def get_frap_pdf(
    frap_id: UUID,
    company_id: UUID = Depends(get_company_id),
    actor=Depends(get_actor),
    db: Session = Depends(get_db),
):
    require_roles(actor, "ADMIN", "DISPATCH", "PARAMEDIC", "DOCTOR", "RECEIVER_MD", "AUDITOR")

    frap = db.query(Frap).filter(Frap.id == frap_id, Frap.company_id == company_id).first()
    if not frap:
        raise HTTPException(status_code=404, detail="FRAP not found")

    if not frap.locked_at or not frap.hash_final:
        raise HTTPException(status_code=409, detail="FRAP must be locked (with hash_final) before PDF")

    sigs_by_role = _require_signatures(db, company_id, frap_id)

    svc = db.query(Service).filter(Service.id == frap.service_id, Service.company_id == company_id).first()
    service = _service_section_fallback(frap, svc)

    company = db.query(Company).filter(Company.id == company_id).first()
    company_name = (getattr(company, "name", "") or "Empresa").strip() if company else "Empresa"
    company_rfc = (getattr(company, "rfc", "") or "").strip() if company else ""
    company_phone = (getattr(company, "phone", "") or "").strip() if company else ""
    company_addr = (getattr(company, "address", "") or "").strip() if company else ""

    unit_str = ""
    if Unit is not None and svc and getattr(svc, "unit_id", None):
        try:
            unit = db.query(Unit).filter(Unit.id == svc.unit_id).first()
            if unit:
                code = getattr(unit, "code", "") or ""
                plate = getattr(unit, "plate", "") or ""
                unit_str = f"{code}{(' / ' + plate) if plate else ''}"
        except Exception:
            unit_str = ""

    # Timeline rows (ServiceTimeline + FrapEvent)
    timeline_rows: list[dict[str, Any]] = []
    if svc:
        for it in _service_status_items(svc):
            ts = it.get("ts")
            timeline_rows.append(
                {
                    "ts": ts,
                    "ts_s": _fmt_local(ts),
                    "type": "status",
                    "data": it.get("data") or {},
                    "user_role": "Sistema",
                    "unit": unit_str,
                }
            )

    users_map: dict[str, str] = {}
    if FrapEvent is not None:
        evs = (
            db.query(FrapEvent)
            .filter(FrapEvent.company_id == company_id, FrapEvent.frap_id == frap_id)
            .order_by(FrapEvent.ts.asc(), FrapEvent.created_at.asc())
            .all()
        )
        if User is not None:
            user_ids = {e.created_by for e in evs if getattr(e, "created_by", None)}
            if user_ids:
                for u in db.query(User).filter(User.id.in_(list(user_ids))).all():
                    users_map[str(u.id)] = f"{(getattr(u,'name','') or '').strip()} ({(getattr(u,'role','') or '').strip()})".strip()

        for e in evs:
            ts = getattr(e, "ts", None)
            data = getattr(e, "data", None) or {}
            created_by = str(getattr(e, "created_by", "") or "")
            timeline_rows.append(
                {
                    "ts": ts,
                    "ts_s": _fmt_local(ts),
                    "type": getattr(e, "type", "") or "",
                    "data": data,
                    "user_role": users_map.get(created_by) or "N/A",
                    "unit": unit_str,
                }
            )

    timeline_rows.sort(key=lambda r: (r.get("ts") or datetime.min))

    # ===== PDF =====
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter

    left = 50
    right = width - 50
    top = height - 45
    bottom = 55
    line_h = 11

    # Light color palette (safe)
    def set_rgb(r: float, g: float, b: float):
        # reportlab expects 0..1
        c.setFillColorRGB(r, g, b)
        c.setStrokeColorRGB(r, g, b)

    def draw_wrapped(text: str, x: float, y: float, max_chars: int, font="Helvetica", size=9.5) -> float:
        c.setFont(font, size)
        for part in textwrap.wrap(text, width=max_chars, break_long_words=True, break_on_hyphens=True):
            c.drawString(x, y, part)
            y -= line_h
        return y

    def section_header(title: str, y: float) -> float:
        # colored band
        set_rgb(0.10, 0.18, 0.35)  # deep blue
        c.rect(left, y - 14, right - left, 18, stroke=0, fill=1)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(left + 10, y - 9, title)
        # reset to black
        c.setFillColorRGB(0, 0, 0)
        c.setStrokeColorRGB(0, 0, 0)
        return y - 22

    def header():
        # top bar
        set_rgb(0.10, 0.18, 0.35)
        c.rect(0, height - 28, width, 28, stroke=0, fill=1)

        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 12.5)
        c.drawString(left, height - 18, company_name)

        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica", 8.6)
        bits = []
        if company_rfc:
            bits.append(f"RFC: {company_rfc}")
        if company_phone:
            bits.append(f"Tel: {company_phone}")
        if bits:
            c.drawRightString(right, height - 18, " | ".join(bits))

        # reset
        c.setFillColorRGB(0, 0, 0)
        c.setStrokeColorRGB(0, 0, 0)

        # address
        y_addr = top - 10
        if company_addr:
            c.setFont("Helvetica", 8.6)
            for part in textwrap.wrap(f"Dirección: {company_addr}", width=92):
                c.drawString(left, y_addr, part)
                y_addr -= 10

        # folio / lock
        c.setFont("Helvetica-Bold", 10.2)
        c.drawString(left, top - 44, f"Folio: {frap.folio}")

        c.setFont("Helvetica-Bold", 9.4)
        c.drawString(left, top - 60, "DOCUMENTO BLOQUEADO")
        c.setFont("Helvetica", 8.4)
        c.drawString(left, top - 73, f"Hash:")
        # hash on next line wrapped to avoid overlap
        c.setFont("Helvetica", 7.6)
        hh = frap.hash_final or ""
        y_hash = top - 84
        for part in textwrap.wrap(hh, width=78):
            c.drawString(left + 28, y_hash, part)
            y_hash -= 9

        c.setFont("Helvetica", 8.2)
        c.drawString(left, y_hash - 2, f"Bloqueado: {_fmt_local(frap.locked_at)}")

        # QR
        _draw_qr(
            c,
            right - 70,
            top - 94,
            70,
            f"{frap.folio}|{frap.hash_final}|{frap.locked_at.isoformat()}",
        )

    def new_page():
        c.showPage()
        header()
        return top - 120

    def draw_sig_fit(img: ImageReader, x: float, y: float, w: float, h: float):
        try:
            iw, ih = img.getSize()
            if iw and ih:
                s = min(w / iw, h / ih)
                nw, nh = iw * s, ih * s
                ox, oy = x + (w - nw) / 2, y + (h - nh) / 2
                c.drawImage(img, ox, oy, nw, nh, preserveAspectRatio=True, mask="auto")
                return
        except Exception:
            pass
        c.drawImage(img, x, y, w, h, preserveAspectRatio=True, mask="auto")

    header()
    y = top - 120

    # Servicio
    y = section_header("Datos del servicio", y)
    c.setFont("Helvetica", 9.8)
    y = draw_wrapped(f"Tipo de servicio: {_cap(service.get('service_type',''))}", left + 10, y, 95, size=9.8)
    y = draw_wrapped(f"Prioridad: {_cap(service.get('priority',''))}", left + 10, y, 95, size=9.8)
    y = draw_wrapped(f"Lugar: {_cap(service.get('location',''))}", left + 10, y, 95, size=9.8)
    y = draw_wrapped(f"Motivo: {_cap(service.get('motive',''))}", left + 10, y, 95, size=9.8)
    y = draw_wrapped(f"Solicita: {_cap(service.get('requested_by',''))}", left + 10, y, 95, size=9.8)
    if unit_str:
        y = draw_wrapped(f"Unidad: {unit_str}", left + 10, y, 95, size=9.8)
    y -= 6


    # Paciente
    pdata = (frap.data or {}).get("patient") or {}
    if isinstance(pdata, dict):
        # only show if at least one meaningful field
        meaningful = any(v not in (None, "", [], {}) for v in pdata.values())
        if meaningful:
            if y - 140 < bottom:
                y = new_page()
            y = section_header("Datos del paciente", y)
            c.setFont("Helvetica", 9.8)

            def _p(label: str, val: Any):
                nonlocal y
                if val in (None, "", [], {}):
                    return
                y = draw_wrapped(f"{label}: {_cap(val)}", left + 10, y, 95, size=9.8)

            _p("Nombre", pdata.get("full_name"))
            if pdata.get("age") not in (None, ""):
                _p("Edad", pdata.get("age"))
            _p("Sexo", pdata.get("sex"))

            id_type = pdata.get("id_type")
            id_value = pdata.get("id_value")
            if id_type or id_value:
                _p("Identificación", f"{_cap(id_type)} {_cap(id_value)}".strip())

            _p("Domicilio", pdata.get("address"))
            _p("Alergias", pdata.get("allergies"))
            _p("Padecimientos / antecedentes", pdata.get("conditions"))
            _p("Medicamentos habituales", pdata.get("meds_home"))
            _p("Embarazo", pdata.get("pregnancy"))

            resp = pdata.get("responsible")
            if isinstance(resp, dict) and any(v not in (None, "", [], {}) for v in resp.values()):
                name = _cap(resp.get("name") or resp.get("full_name") or "")
                rel = _cap(resp.get("relationship") or resp.get("relation") or "")
                phone = _cap(resp.get("phone") or resp.get("tel") or "")
                bits = [b for b in [name, rel, phone] if b]
                if bits:
                    _p("Responsable", " / ".join(bits))

            y -= 6

    # Entrega / Recepción
    tdata = (frap.data or {}).get("transport") or {}
    if isinstance(tdata, dict):
        meaningful = any(v not in (None, "", [], {}) for v in tdata.values())
        if meaningful:
            if y - 140 < bottom:
                y = new_page()
            y = section_header("Entrega / Recepción", y)
            c.setFont("Helvetica", 9.8)

            dest = tdata.get("destination") or {}
            if isinstance(dest, dict):
                hosp = dest.get("hospital_name") or dest.get("name")
                hid = dest.get("hospital_id")
                if hosp or hid:
                    v = _cap(hosp)
                    if hid:
                        v = f"{v} ({_cap(hid)})" if v else _cap(hid)
                    y = draw_wrapped(f"Destino: {v}", left + 10, y, 95, size=9.8)

            recv = tdata.get("receiving") or {}
            if isinstance(recv, dict):
                rname = recv.get("name")
                rsvc = recv.get("service")
                if rname or rsvc:
                    v = " / ".join([b for b in [_cap(rname), _cap(rsvc)] if b])
                    y = draw_wrapped(f"Receptor: {v}", left + 10, y, 95, size=9.8)

            hs = tdata.get("handoff_summary")
            if hs:
                y = draw_wrapped(f"Resumen: {_cap(hs)}", left + 10, y, 95, size=9.8)

            oc = tdata.get("outcome")
            if oc:
                y = draw_wrapped(f"Resultado: {_cap(oc)}", left + 10, y, 95, size=9.8)

            y -= 6

    # Timeline
    y = section_header("Cronología (eventos)", y)
    c.setFont("Helvetica", 9.0)

    def event_block_height(lines: list[str]) -> int:
        # conservative estimate: each line may wrap
        total = 0
        for ln in lines:
            total += max(1, (len(ln) // 95) + 1)
        return total * line_h + 10

    for row in timeline_rows:
        ts_s = _cap(row.get("ts_s"))
        typ = _event_title(_cap(row.get("type")))
        det_lines = _event_detail(_cap(row.get("type")), row.get("data") or {})
        user_role = _cap(row.get("user_role"))
        unit = _cap(row.get("unit"))

        lines = []
        # line 1: timestamp + type
        lines.append(f"{ts_s} - {typ}")
        # detail lines (human-friendly)
        max_det = 12 if _cap(row.get("type")) in ("vitals", "vital", "signos", "signos_vitales") else 6
        lines.extend(det_lines[:max_det])
        if user_role and user_role != "N/A":
            lines.append(f"Usuario: {user_role}")
        if unit:
            lines.append(f"Unidad: {unit}")

        need = event_block_height(lines)
        if y - need < bottom + 140:
            y = new_page()
            y = section_header("Cronología (continuación)", y)
            c.setFont("Helvetica", 9.0)

        # draw event box (subtle)
        set_rgb(0.92, 0.95, 0.99)  # light blue-gray fill
        c.rect(left + 6, y - (need - 6), right - left - 12, need - 2, stroke=0, fill=1)
        c.setFillColorRGB(0, 0, 0)
        c.setStrokeColorRGB(0.85, 0.88, 0.92)

        # write lines
        c.setFont("Helvetica-Bold", 9.2)
        y = draw_wrapped(lines[0], left + 12, y - 4, 95, font="Helvetica-Bold", size=9.2)
        c.setFont("Helvetica", 9.0)
        for ln in lines[1:]:
            y = draw_wrapped(ln, left + 16, y, 95, size=9.0)

        y -= 8  # gap

    # Firmas
    box_w, box_h = 170, 86
    sig_block_h = 14 + 10 + box_h + 52
    if y - sig_block_h < bottom:
        y = new_page()

    y = section_header("Firmas", y)
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica", 9)
    c.drawString(left, y, "Responsable / Paciente")
    c.drawString(left + 200, y, "Tripulación")
    c.drawString(left + 400, y, "Receptor (Hospital)")
    y -= 10

    xs = [left, left + 200, left + 400]
    roles = ["responsable", "tripulacion", "receptor"]
    y0 = y - box_h - 6

    # signature boxes (subtle border)
    c.setStrokeColorRGB(0.70, 0.74, 0.78)
    for i, role in enumerate(roles):
        x = xs[i]
        c.rect(x, y0, box_w, box_h, stroke=1, fill=0)
        sig = sigs_by_role.get(role)
        if sig:
            try:
                img = _sig_image_reader(sig)
                draw_sig_fit(img, x + 5, y0 + 5, box_w - 10, box_h - 10)

                name = _cap(sig.signer_name)
                ts = _fmt_local(sig.signed_at)

                # Vertical, wrapped caption (no overlap)
                c.setFillColorRGB(0, 0, 0)
                c.setFont("Helvetica", 6.8)
                caption_y = y0 - 10
                max_chars = 22

                for part in textwrap.wrap(name, width=max_chars)[:3]:
                    c.drawString(x, caption_y, part)
                    caption_y -= 8
                for part in textwrap.wrap(ts, width=max_chars)[:2]:
                    c.drawString(x, caption_y, part)
                    caption_y -= 8

            except Exception:
                c.setFillColorRGB(0, 0, 0)
                c.setFont("Helvetica-Oblique", 8)
                c.drawString(x + 5, y0 + box_h / 2, "Firma no disponible")
        else:
            c.setFillColorRGB(0, 0, 0)
            c.setFont("Helvetica-Oblique", 8)
            c.drawString(x + 5, y0 + box_h / 2, "Sin firma")

    c.setFillColorRGB(0.35, 0.37, 0.40)
    c.setFont("Helvetica", 7.6)
    c.drawString(left, bottom - 18, "Documento generado automáticamente. Incluye QR, hash y cronología para validación.")

    c.save()
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{frap.folio}.pdf"'},
    )
