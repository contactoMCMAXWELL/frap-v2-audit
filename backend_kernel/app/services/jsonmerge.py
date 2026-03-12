from typing import Any, Dict

def deep_merge(dst: Dict[str, Any], src: Dict[str, Any]) -> Dict[str, Any]:
    for k, v in (src or {}).items():
        if v is None:
            continue
        if isinstance(v, dict) and isinstance(dst.get(k), dict):
            dst[k] = deep_merge(dst.get(k) or {}, v)
        else:
            dst[k] = v
    return dst
