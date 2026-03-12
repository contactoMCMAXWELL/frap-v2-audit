from __future__ import annotations

import base64
import json
import hmac
import hashlib
import os
import time
from typing import Any, Dict


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64url_decode(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + pad).encode("utf-8"))


def _get_secret() -> str:
    # must be stable: set SECRET_KEY in .env
    return os.getenv("SECRET_KEY", "dev-secret-change-me")


def create_access_token(payload: Dict[str, Any], expires_in_seconds: int = 60 * 60 * 24) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    body = dict(payload)
    body["iat"] = now
    body["exp"] = now + int(expires_in_seconds)

    h = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    b = _b64url_encode(json.dumps(body, separators=(",", ":")).encode("utf-8"))
    msg = f"{h}.{b}".encode("utf-8")

    sig = hmac.new(_get_secret().encode("utf-8"), msg, hashlib.sha256).digest()
    s = _b64url_encode(sig)
    return f"{h}.{b}.{s}"


def decode_token(token: str) -> Dict[str, Any]:
    h, b, s = token.split(".")
    msg = f"{h}.{b}".encode("utf-8")

    expected = hmac.new(_get_secret().encode("utf-8"), msg, hashlib.sha256).digest()
    got = _b64url_decode(s)

    if not hmac.compare_digest(expected, got):
        raise ValueError("Invalid token signature")

    body = json.loads(_b64url_decode(b).decode("utf-8"))
    exp = int(body.get("exp", 0))
    if exp and int(time.time()) > exp:
        raise ValueError("Token expired")

    return body