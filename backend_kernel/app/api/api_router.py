from __future__ import annotations

import importlib

from fastapi import APIRouter

from app.api import auth, services, units, fraps

api_router = APIRouter()

# Base modules
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(services.router, prefix="/services", tags=["services"])
api_router.include_router(units.router, prefix="/units", tags=["units"])

# FRAP base (get/lock/pdf/etc)
api_router.include_router(fraps.router, prefix="/fraps", tags=["fraps"])

# Optional: FRAP events
try:
    frap_events = importlib.import_module("app.api.frap_events")
    api_router.include_router(frap_events.router, prefix="/fraps", tags=["frap_events"])
except Exception:
    pass

# Optional: FRAP signatures
try:
    frap_signatures = importlib.import_module("app.api.frap_signatures")
    api_router.include_router(frap_signatures.router, prefix="/fraps", tags=["frap_signatures"])
except Exception:
    pass
