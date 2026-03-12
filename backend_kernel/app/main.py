from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Robust import:
# - Prefer "api_router" variable from app.api.api_router
# - Fallback to module attribute if someone imported the module by mistake
try:
    from app.api.api_router import api_router  # type: ignore
except Exception:  # pragma: no cover
    import app.api.api_router as _api_router_module  # type: ignore
    api_router = getattr(_api_router_module, "api_router", _api_router_module)

# Admin routers (SaaS / tenancy)
try:
    from app.api.admin_companies import router as admin_companies_router  # type: ignore
except Exception:  # pragma: no cover
    admin_companies_router = None

try:
    from app.api.admin_users import router as admin_users_router  # type: ignore
except Exception:  # pragma: no cover
    admin_users_router = None

app = FastAPI(title="FRAP API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.mc-maxwell.com","http://localhost:8080","http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core API (auth, services, units, fraps)
app.include_router(api_router, prefix="/api")

# Admin API (SUPERADMIN / ADMIN)
# These routers already include "/api/admin" prefix internally.
if admin_companies_router is not None:
    app.include_router(admin_companies_router)

if admin_users_router is not None:
    app.include_router(admin_users_router)

@app.get("/health")
def health():
    return {"ok": True}