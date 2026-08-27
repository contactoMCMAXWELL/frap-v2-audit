from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.frap import Frap
from app.models.signature import Signature


REQUIRED_SIGNATURE_ROLES = ("RESPONSABLE", "TRIPULACION", "RECEPTOR")


def _utcnow():
    return datetime.now(timezone.utc)


def _json_default(o: Any):
    # UUID, datetime, decimals, etc.
    try:
        return str(o)
    except Exception:
        return repr(o)


def _canonical_json(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=_json_default)


def normalize_role(role: str) -> str:
    r = (role or "").strip().upper()
    aliases = {
        "RESPONSIBLE": "RESPONSABLE",
        "RESP": "RESPONSABLE",
        "CREW": "TRIPULACION",
        "TRIPULACIÓN": "TRIPULACION",
        "DOCTOR": "RECEPTOR",
        "RECEIVER": "RECEPTOR",
        "RECEPTOR/DOCTOR": "RECEPTOR",
    }
    return aliases.get(r, r)


def get_signatures_for_frap(db: Session, frap_id) -> List[Signature]:
    sigs = db.query(Signature).filter(Signature.frap_id == frap_id).all()
    return sigs


def assert_required_signatures(db: Session, frap: Frap) -> None:
    sigs = get_signatures_for_frap(db, frap.id)
    roles_present = {normalize_role(s.role) for s in sigs}
    missing = [r for r in REQUIRED_SIGNATURE_ROLES if r not in roles_present]
    if missing:
        raise ValueError(f"Missing required signatures: {', '.join(missing)}")


def _event_payload(e: Any) -> Dict[str, Any]:
    # Best-effort extraction: no asumimos el esquema exacto del modelo.
    return {
        "id": getattr(e, "id", None),
        "type": getattr(e, "type", None) or getattr(e, "kind", None) or getattr(e, "event_type", None),
        "at": getattr(e, "at", None) or getattr(e, "created_at", None) or getattr(e, "timestamp", None),
        "data": getattr(e, "data", None) or getattr(e, "payload", None) or {},
        "by": getattr(e, "created_by", None) or getattr(e, "user_id", None),
    }


def _signature_payload(s: Signature) -> Dict[str, Any]:
    return {
        "id": getattr(s, "id", None),
        "role": normalize_role(s.role),
        "signer_name": s.signer_name,
        "device_id": s.device_id,
        "geo": {
            "lat": s.geo_lat,
            "lng": s.geo_lng,
            "accuracy_m": s.geo_accuracy_m,
        },
        "signed_at": s.signed_at,
        # IMPORTANT: include image bytes in hash (base64 string). Legal integrity.
        "image_base64": s.image_base64,
    }


def compute_hash_final(db: Session, frap: Frap) -> str:
    # events via relationship if loaded; otherwise query via relationship attr if present.
    events: Iterable[Any] = []
    try:
        events = list(getattr(frap, "events", []) or [])
    except Exception:
        events = []

    signatures = get_signatures_for_frap(db, frap.id)

    payload = {
        "frap": {
            "id": frap.id,
            "company_id": frap.company_id,
            "service_id": frap.service_id,
            "folio": frap.folio,
            "created_at": frap.created_at,
            "data": frap.data or {},
        },
        "events": [_event_payload(e) for e in events],
        "signatures": [_signature_payload(s) for s in signatures],
        "meta": {
            # Room for future: schema version
            "hash_version": 1,
        },
    }

    canonical = _canonical_json(payload).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def ensure_unlocked(frap: Frap) -> None:
    if getattr(frap, "locked_at", None):
        raise PermissionError("FRAP is locked")


def lock_frap(db: Session, frap_id, current_user: Any) -> Dict[str, Any]:
    frap: Optional[Frap] = db.query(Frap).filter(Frap.id == frap_id).first()
    if not frap:
        raise LookupError("FRAP not found")

    # Must have required signatures before locking
    assert_required_signatures(db, frap)

    # Idempotent lock:
    # - if locked_at exists, don't change it
    # - ensure hash_final exists (compute if missing)
    if not frap.locked_at:
        frap.locked_at = _utcnow()

    if not frap.hash_final:
        frap.hash_final = compute_hash_final(db, frap)

    db.add(frap)
    db.commit()
    db.refresh(frap)

    return {
        "frap_id": str(frap.id),
        "locked_at": frap.locked_at,
        "hash_final": frap.hash_final,
        "folio": frap.folio,
    }