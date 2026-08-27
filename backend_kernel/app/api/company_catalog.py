from __future__ import annotations

from typing import Any, Dict, List, Optional

import datetime
import json
import re

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from pydantic import BaseModel, Field

# -------------------------------------------------------------------
# Sprint 6B.1 — Company Catalog (DB + version + audit + export)
#
# IMPORTANTE:
# Este router asume SQLAlchemy Session como dependencia get_db():
#   from app.db.session import get_db
# Si tu proyecto lo tiene en otro path, ajusta el import (yo te genero el ZIP).
# -------------------------------------------------------------------

try:
    from app.db.session import get_db  # type: ignore
except Exception:  # pragma: no cover
    get_db = None  # type: ignore

try:
    from sqlalchemy.orm import Session  # type: ignore
    from sqlalchemy import text  # type: ignore
except Exception:  # pragma: no cover
    Session = Any  # type: ignore
    text = None  # type: ignore

router = APIRouter(prefix="/api/companies", tags=["company_catalog"])


# ----------------------------- Models ------------------------------

class CatalogMed(BaseModel):
    name: str
    routes: List[str] = Field(default_factory=list)

class CatalogProcedure(BaseModel):
    name: str

class CompanyCatalogPayload(BaseModel):
    meds: List[CatalogMed] = Field(default_factory=list)
    procedures: List[CatalogProcedure] = Field(default_factory=list)
    version: Optional[int] = None

class CompanyCatalogOut(BaseModel):
    meds: List[CatalogMed] = Field(default_factory=list)
    procedures: List[CatalogProcedure] = Field(default_factory=list)
    version: int = 0

class SaveOk(BaseModel):
    status: str = "ok"
    version: int

class AuditRow(BaseModel):
    id: int
    company_id: str
    actor: str
    prev_version: int
    new_version: int
    summary: str
    created_at: Any


# ----------------------------- Helpers -----------------------------

def _require_db():
    if get_db is None:
        raise HTTPException(
            status_code=500,
            detail="No se encontró dependencia get_db(). Ajusta import en app/api/company_catalog.py",
        )
    if text is None:
        raise HTTPException(status_code=500, detail="SQLAlchemy no disponible (falta instalación).")

def _actor_from_headers(x_user: Optional[str]) -> str:
    if x_user and x_user.strip():
        return x_user.strip()
    return "unknown"

def _normalize_payload(payload: CompanyCatalogPayload) -> Dict[str, Any]:
    meds = []
    for m in payload.meds or []:
        name = (m.name or "").strip()
        if not name:
            continue
        routes = [(r or "").strip() for r in (m.routes or []) if (r or "").strip()]
        meds.append({"name": name, "routes": routes})

    procs = []
    for p in payload.procedures or []:
        name = (p.name or "").strip()
        if not name:
            continue
        procs.append({"name": name})

    return {"meds": meds, "procedures": procs}

def _summarize_diff(prev: Dict[str, Any], nxt: Dict[str, Any]) -> str:
    prev_m = [m.get("name") for m in (prev.get("meds") or []) if isinstance(m, dict) and m.get("name")]
    nxt_m = [m.get("name") for m in (nxt.get("meds") or []) if isinstance(m, dict) and m.get("name")]

    def proc_name(x):
        if isinstance(x, str):
            return x
        if isinstance(x, dict):
            return x.get("name")
        return None

    prev_p = [proc_name(p) for p in (prev.get("procedures") or [])]
    nxt_p = [proc_name(p) for p in (nxt.get("procedures") or [])]
    prev_p = [x for x in prev_p if isinstance(x, str) and x]
    nxt_p = [x for x in nxt_p if isinstance(x, str) and x]

    def add(a, b): return [x for x in b if x not in a]
    def rem(a, b): return [x for x in a if x not in b]

    meds_added = add(prev_m, nxt_m)
    meds_removed = rem(prev_m, nxt_m)
    proc_added = add(prev_p, nxt_p)
    proc_removed = rem(prev_p, nxt_p)

    parts = []
    if meds_added:
        parts.append(f"Meds +{len(meds_added)}: {', '.join(meds_added[:5])}{'…' if len(meds_added) > 5 else ''}")
    if meds_removed:
        parts.append(f"Meds -{len(meds_removed)}: {', '.join(meds_removed[:5])}{'…' if len(meds_removed) > 5 else ''}")
    if proc_added:
        parts.append(f"Proc +{len(proc_added)}: {', '.join(proc_added[:5])}{'…' if len(proc_added) > 5 else ''}")
    if proc_removed:
        parts.append(f"Proc -{len(proc_removed)}: {', '.join(proc_removed[:5])}{'…' if len(proc_removed) > 5 else ''}")

    return " · ".join(parts) if parts else "Sin cambios detectables (reorden/metadata)."

def _parse_date(s: Optional[str], end_of_day: bool) -> Optional[str]:
    if not s:
        return None
    s = s.strip()
    if not s:
        return None
    try:
        if len(s) == 10 and re.match(r"^\d{4}-\d{2}-\d{2}$", s):
            return f"{s}T23:59:59.999Z" if end_of_day else f"{s}T00:00:00.000Z"
        dt = datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    except Exception:
        return None

def _csv_escape(v: Any) -> str:
    s = "" if v is None else str(v)
    if any(c in s for c in [",", '"', "\n", "\r"]):
        return '"' + s.replace('"', '""') + '"'
    return s


# ------------------------------ Routes -----------------------------

@router.get("/{company_id}/catalog", response_model=CompanyCatalogOut)
def get_company_catalog(company_id: str, db: Session = Depends(get_db)):  # type: ignore
    _require_db()
    row = db.execute(
        text("SELECT catalog_json, version FROM frap_company_catalog WHERE company_id = :cid"),
        {"cid": company_id},
    ).fetchone()

    if not row:
        return CompanyCatalogOut(meds=[], procedures=[], version=0)

    catalog = row[0] or {"meds": [], "procedures": []}
    version = int(row[1] or 0)

    procs2 = []
    for p in (catalog.get("procedures") or []):
        if isinstance(p, str) and p.strip():
            procs2.append({"name": p.strip()})
        elif isinstance(p, dict) and p.get("name"):
            procs2.append({"name": str(p.get("name")).strip()})

    meds2 = []
    for m in (catalog.get("meds") or []):
        if isinstance(m, dict) and m.get("name"):
            name = str(m.get("name")).strip()
            routes = m.get("routes") or []
            routes2 = [str(r).strip() for r in routes if str(r).strip()]
            meds2.append({"name": name, "routes": routes2})

    return CompanyCatalogOut(meds=meds2, procedures=procs2, version=version)


@router.put("/{company_id}/catalog", response_model=SaveOk)
def save_company_catalog(
    company_id: str,
    payload: CompanyCatalogPayload,
    db: Session = Depends(get_db),  # type: ignore
    x_user: Optional[str] = Header(default=None, alias="X-User"),
):
    _require_db()

    actor = _actor_from_headers(x_user)
    client_version = payload.version
    next_catalog = _normalize_payload(payload)

    # OJO: Para JSONB con SQLAlchemy text(), usa CAST(:param AS jsonb) (no :param::jsonb),
    # porque :param::jsonb puede romper el parsing de bind params.
    try:
        db.execute(text("BEGIN"))

        cur = db.execute(
            text("SELECT catalog_json, version FROM frap_company_catalog WHERE company_id = :cid FOR UPDATE"),
            {"cid": company_id},
        ).fetchone()

        if not cur:
            new_version = 1
            db.execute(
                text(
                    "INSERT INTO frap_company_catalog (company_id, catalog_json, version, updated_at) "
                    "VALUES (:cid, CAST(:catalog_json AS jsonb), :ver, NOW())"
                ),
                {"cid": company_id, "catalog_json": json.dumps(next_catalog), "ver": new_version},
            )

            summary = _summarize_diff({"meds": [], "procedures": []}, next_catalog)
            db.execute(
                text(
                    "INSERT INTO frap_company_catalog_audit "
                    "(company_id, actor, prev_version, new_version, prev_catalog_json, new_catalog_json, summary, created_at) "
                    "VALUES (:cid, :actor, :pv, :nv, CAST(:pjson AS jsonb), CAST(:njson AS jsonb), :summary, NOW())"
                ),
                {
                    "cid": company_id,
                    "actor": actor,
                    "pv": 0,
                    "nv": new_version,
                    "pjson": json.dumps({"meds": [], "procedures": []}),
                    "njson": json.dumps(next_catalog),
                    "summary": summary,
                },
            )

            db.execute(text("COMMIT"))
            return SaveOk(version=new_version)

        prev_catalog = cur[0] or {"meds": [], "procedures": []}
        prev_version = int(cur[1] or 0)

        if client_version is None:
            db.execute(text("ROLLBACK"))
            raise HTTPException(status_code=409, detail="Conflict: falta version (cliente desactualizado)")
        if int(client_version) != prev_version:
            db.execute(text("ROLLBACK"))
            raise HTTPException(status_code=409, detail="Conflict: el catálogo fue modificado por otro usuario")

        upd = db.execute(
            text(
                "UPDATE frap_company_catalog "
                "SET catalog_json = CAST(:catalog_json AS jsonb), version = version + 1, updated_at = NOW() "
                "WHERE company_id = :cid AND version = :ver "
                "RETURNING version"
            ),
            {"cid": company_id, "ver": prev_version, "catalog_json": json.dumps(next_catalog)},
        ).fetchone()

        if not upd:
            db.execute(text("ROLLBACK"))
            raise HTTPException(status_code=409, detail="Conflict: el catálogo fue modificado por otro usuario")

        new_version = int(upd[0])
        summary = _summarize_diff(prev_catalog, next_catalog)

        db.execute(
            text(
                "INSERT INTO frap_company_catalog_audit "
                "(company_id, actor, prev_version, new_version, prev_catalog_json, new_catalog_json, summary, created_at) "
                "VALUES (:cid, :actor, :pv, :nv, CAST(:pjson AS jsonb), CAST(:njson AS jsonb), :summary, NOW())"
            ),
            {
                "cid": company_id,
                "actor": actor,
                "pv": prev_version,
                "nv": new_version,
                "pjson": json.dumps(prev_catalog),
                "njson": json.dumps(next_catalog),
                "summary": summary,
            },
        )

        db.execute(text("COMMIT"))
        return SaveOk(version=new_version)

    except HTTPException:
        raise
    except Exception as e:
        try:
            db.execute(text("ROLLBACK"))
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{company_id}/catalog/audit", response_model=List[AuditRow])
def get_catalog_audit(
    company_id: str,
    limit: int = Query(default=30, ge=1, le=200),
    actor: str = Query(default=""),
    from_: Optional[str] = Query(default=None, alias="from"),
    to: Optional[str] = Query(default=None, alias="to"),
    db: Session = Depends(get_db),  # type: ignore
):
    _require_db()

    actor = (actor or "").strip()
    f_iso = _parse_date(from_, end_of_day=False)
    t_iso = _parse_date(to, end_of_day=True)

    where = ["company_id = :cid"]
    params: Dict[str, Any] = {"cid": company_id, "limit": limit}

    if actor:
        where.append("actor ILIKE :actor")
        params["actor"] = f"%{actor}%"
    if f_iso:
        where.append("created_at >= :from")
        params["from"] = f_iso
    if t_iso:
        where.append("created_at <= :to")
        params["to"] = t_iso

    q = (
        "SELECT id, company_id, actor, prev_version, new_version, summary, created_at "
        "FROM frap_company_catalog_audit "
        f"WHERE {' AND '.join(where)} "
        "ORDER BY created_at DESC "
        "LIMIT :limit"
    )

    rows = db.execute(text(q), params).fetchall()
    return [
        AuditRow(
            id=int(r[0]),
            company_id=str(r[1]),
            actor=str(r[2]),
            prev_version=int(r[3]),
            new_version=int(r[4]),
            summary=str(r[5] or ""),
            created_at=r[6],
        )
        for r in rows
    ]


@router.get("/{company_id}/catalog/export.json")
def export_catalog_json(company_id: str, db: Session = Depends(get_db)):  # type: ignore
    _require_db()

    r = db.execute(
        text("SELECT catalog_json, version, updated_at FROM frap_company_catalog WHERE company_id = :cid"),
        {"cid": company_id},
    ).fetchone()

    if not r:
        payload = {"company_id": company_id, "meds": [], "procedures": [], "version": 0, "updated_at": None}
    else:
        payload = {
            "company_id": company_id,
            **(r[0] or {}),
            "version": int(r[1] or 0),
            "updated_at": r[2].isoformat() if r[2] else None,
        }

    fname = f"catalog_{company_id}.json"
    body = json.dumps(payload, indent=2, ensure_ascii=False)
    return Response(
        content=body,
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.get("/{company_id}/catalog/audit/export.csv")
def export_audit_csv(
    company_id: str,
    limit: int = Query(default=1000, ge=1, le=5000),
    actor: str = Query(default=""),
    from_: Optional[str] = Query(default=None, alias="from"),
    to: Optional[str] = Query(default=None, alias="to"),
    db: Session = Depends(get_db),  # type: ignore
):
    _require_db()

    actor = (actor or "").strip()
    f_iso = _parse_date(from_, end_of_day=False)
    t_iso = _parse_date(to, end_of_day=True)

    where = ["company_id = :cid"]
    params: Dict[str, Any] = {"cid": company_id, "limit": limit}

    if actor:
        where.append("actor ILIKE :actor")
        params["actor"] = f"%{actor}%"
    if f_iso:
        where.append("created_at >= :from")
        params["from"] = f_iso
    if t_iso:
        where.append("created_at <= :to")
        params["to"] = t_iso

    q = (
        "SELECT id, actor, prev_version, new_version, summary, created_at "
        "FROM frap_company_catalog_audit "
        f"WHERE {' AND '.join(where)} "
        "ORDER BY created_at DESC "
        "LIMIT :limit"
    )

    rows = db.execute(text(q), params).fetchall()

    header = ["id", "actor", "prev_version", "new_version", "summary", "created_at"]
    lines = [",".join(header)]
    for r in rows:
        created = r[5].isoformat() if r[5] else ""
        lines.append(",".join([_csv_escape(r[0]), _csv_escape(r[1]), _csv_escape(r[2]), _csv_escape(r[3]), _csv_escape(r[4]), _csv_escape(created)]))

    fname = f"catalog_audit_{company_id}.csv"
    return Response(
        content="\n".join(lines),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )
