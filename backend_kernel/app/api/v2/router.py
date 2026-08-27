from fastapi import APIRouter

from app.api.v2.company_licenses import router as company_licenses_router
from app.api.v2.company_pdf_config import router as company_pdf_config_router
from app.api.v2.service_intake import router as service_intake_router
from app.api.v2.service_dispatch_events import router as service_dispatch_events_router
from app.api.v2.timeline import router as timeline_router
from app.api.v2.service_supplies import router as service_supplies_router
from app.api.v2.service_financials import router as service_financials_router
from app.api.v2.admin_dashboard import router as admin_dashboard_router
from app.api.v2.frap_clinical import router as frap_clinical_router
from app.api.v2.frap_vital_signs import router as frap_vital_signs_router
from app.api.v2.frap_procedures import router as frap_procedures_router
from app.api.v2.frap_medications import router as frap_medications_router
from app.api.v2.company_supplies import router as company_supplies_router
from app.api.v2.frap_trauma import router as frap_trauma_router
from app.api.v2.frap_refusal import router as frap_refusal_router
from app.api.v2.frap_handoff import router as frap_handoff_router
from app.api.v2.frap_body_map import router as frap_body_map_router
from app.api.v2.frap_cardio import router as frap_cardio_router
from app.api.v2.frap_pediatrics import router as frap_pediatrics_router
from app.api.v2.frap_pregnancy import router as frap_pregnancy_router
from app.api.v2.roles import router as roles_router
from app.api.v2.hospital_catalog import router as hospital_catalog_router
from app.api.v2.medication_catalog import router as medication_catalog_router
from app.api.v2.procedure_catalog import router as procedure_catalog_router
from app.api.v2.units_admin import router as units_admin_router
from app.api.v2.frap_signatures import router as frap_signatures_router
from app.api.v2.frap_pdf import router as frap_pdf_router
from app.api.v2 import licenses
from app.api.v2.session import router as session_router

router = APIRouter()
router.include_router(company_licenses_router)
router.include_router(company_pdf_config_router)
router.include_router(service_intake_router)
router.include_router(service_dispatch_events_router)
router.include_router(timeline_router)
router.include_router(service_supplies_router)
router.include_router(service_financials_router)
router.include_router(admin_dashboard_router)
router.include_router(frap_clinical_router)
router.include_router(frap_vital_signs_router)
router.include_router(frap_procedures_router)
router.include_router(frap_medications_router)
router.include_router(company_supplies_router)
router.include_router(frap_trauma_router)
router.include_router(frap_body_map_router)
router.include_router(frap_refusal_router)
router.include_router(frap_handoff_router)
router.include_router(frap_cardio_router)
router.include_router(frap_pediatrics_router)
router.include_router(frap_pregnancy_router)
router.include_router(roles_router)
router.include_router(hospital_catalog_router)
router.include_router(medication_catalog_router)
router.include_router(procedure_catalog_router)
router.include_router(units_admin_router)
router.include_router(frap_signatures_router)
router.include_router(frap_pdf_router)
router.include_router(licenses.router)
router.include_router(session_router)