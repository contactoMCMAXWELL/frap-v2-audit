from __future__ import annotations

import os
import hmac
import hashlib
from typing import Tuple, Optional

# ============================================================
# Password hashing (PBKDF2 compatible with existing DB)
# Stored format:
#   pbkdf2$<iterations>$<salt_hex>$<dk_hex>
# ============================================================

DEFAULT_ITERATIONS = 120_000


def _pbkdf2_hash(password: str, salt: bytes, iterations: int) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)


def hash_password(password: str, iterations: int = DEFAULT_ITERATIONS) -> str:
    salt = os.urandom(16)
    dk = _pbkdf2_hash(password, salt, iterations)
    return f"pbkdf2${iterations}${salt.hex()}${dk.hex()}"


def _parse_pbkdf2(stored: str) -> Optional[Tuple[int, bytes, bytes]]:
    try:
        parts = stored.split("$")
        if len(parts) != 4:
            return None
        scheme, it_s, salt_hex, dk_hex = parts
        if scheme != "pbkdf2":
            return None
        iterations = int(it_s)
        salt = bytes.fromhex(salt_hex)
        dk = bytes.fromhex(dk_hex)
        return iterations, salt, dk
    except Exception:
        return None


def verify_password(password: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False

    parsed = _parse_pbkdf2(stored_hash)
    if not parsed:
        return False

    iterations, salt, dk = parsed
    test = _pbkdf2_hash(password, salt, iterations)
    return hmac.compare_digest(test, dk)