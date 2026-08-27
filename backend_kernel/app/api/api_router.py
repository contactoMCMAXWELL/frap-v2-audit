from __future__ import annotations

import importlib
from fastapi import APIRouter

from app.api import auth, services, units, fraps
from app.api.v2 import router as v2_router
from app.api.admin import router as admin_router
from app.api.companies import router as companies_router
from app.api.v2 import frap_assessment

api_router = APIRouter()
api_router.include_router(frap_assessment.router)
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

# Admin + companies
api_router.include_router(admin_router)
api_router.include_router(companies_router)

# V2 modules
api_router.include_router(v2_router)