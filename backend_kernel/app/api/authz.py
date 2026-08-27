from __future__ import annotations

"""Compatibility shim for authorization helpers.

Your API modules currently import:
    from app.api.authz import get_actor, require_roles

But the actual implementation lives in:
    app.services.authz

This shim avoids changing multiple files and keeps the API stable.
"""

try:
    from app.services.authz import get_actor, require_roles  # type: ignore
except Exception as e:  # pragma: no cover
    # If your project moved these elsewhere, this error will show clearly in logs.
    raise ImportError("Cannot import get_actor/require_roles from app.services.authz") from e

__all__ = ["get_actor", "require_roles"]
