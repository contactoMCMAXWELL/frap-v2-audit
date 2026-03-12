from fastapi import APIRouter
from app.api.catalogs import router as catalogs_router
from app.api.services import router as services_router
from app.api.fraps import router as fraps_router
from app.api.signatures import router as signatures_router
from app.api.fraps_v1 import router as fraps_v1_router 

from app.api.company_catalog import router as company_catalog_router

from app.api.companies import router as companies_router
from app.api.units import router as units_router
from app.api.users import router as users_router
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router

api_router = APIRouter()
api_router.include_router(catalogs_router)
api_router.include_router(services_router)
api_router.include_router(fraps_router)
api_router.include_router(signatures_router)
api_router.include_router(fraps_v1_router)  
api_router.include_router(company_catalog_router)

api_router.include_router(companies_router)
api_router.include_router(units_router)
api_router.include_router(users_router)
api_router.include_router(auth_router)
api_router.include_router(admin_router)
