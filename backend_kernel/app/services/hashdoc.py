import json
import hashlib
from typing import Any, Dict, List

def _canon(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))

def compute_frap_hash(payload: Dict[str, Any]) -> str:
    raw = _canon(payload).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()

def build_hash_payload(*, folio: str, frap_data: Dict[str, Any], signatures: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "folio": folio,
        "data": frap_data or {},
        "signatures": signatures,
        "version": "FRAP-HASH-v1",
    }
