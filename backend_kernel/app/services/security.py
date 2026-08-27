# app/services/security.py
from __future__ import annotations

# Bridge module: admin.py expects app.services.security
# Re-export from app.services.auth to avoid breaking imports.
from app.services.auth import hash_password, verify_password  # noqa: F401
