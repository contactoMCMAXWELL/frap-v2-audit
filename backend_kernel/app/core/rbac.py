from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import base64
import json

bearer = HTTPBearer(auto_error=True)

def _decode_jwt_payload(token: str) -> dict:
    """
    Decodifica SOLO el payload del JWT sin validar firma (RBAC de UI/routers).
    OJO: Para seguridad completa, valida firma en tu auth middleware.
    Aquí lo usamos porque tu login ya emite role/company_id en el token y
    estás usando HTTPBearer en otros endpoints.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("bad jwt format")
        payload_b64 = parts[1]
        # pad base64url
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload_json = base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8")
        return json.loads(payload_json)
    except Exception:
        return {}

def require_roles(*allowed_roles: str):
    allowed = set(allowed_roles)

    def _dep(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
        token = creds.credentials
        payload = _decode_jwt_payload(token)
        role = payload.get("role")

        if not role or role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: insufficient role",
            )
        return payload

    return _dep