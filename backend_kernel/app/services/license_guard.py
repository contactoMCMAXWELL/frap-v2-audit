from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.company_license import CompanyLicense
from app.services.company_license_service import CompanyLicenseService


class LicenseGuard:
    @staticmethod
    def is_active(license_row: CompanyLicense | None) -> bool:
        return CompanyLicenseService.is_active_effective(license_row)

    @staticmethod
    def normalize_features(features: dict | None) -> dict:
        return CompanyLicenseService.normalize_features(features)

    @staticmethod
    def feature_enabled(license_row: CompanyLicense | None, feature: str) -> bool:
        if not license_row:
            return False

        requested = str(feature or "").strip().lower()
        features = LicenseGuard.normalize_features(getattr(license_row, "features_json", None))

        if requested in features:
            return bool(features[requested])

        aliases = {
            "frap_clinical": "clinical",
            "frap_clinical_v2": "clinical",
        }
        mapped = aliases.get(requested, requested)
        return bool(features.get(mapped, False))


def require_company_license(db: Session, company_id: UUID) -> CompanyLicense:
    license_row = CompanyLicenseService.ensure_license(db, company_id)

    if not LicenseGuard.is_active(license_row):
        effective_status = CompanyLicenseService.get_effective_status(license_row)
        raise HTTPException(
            status_code=403,
            detail=f"Company license inactive ({effective_status})",
        )

    return license_row


def require_company_feature(db: Session, company_id: UUID, feature: str) -> CompanyLicense:
    license_row = require_company_license(db, company_id)

    if not LicenseGuard.feature_enabled(license_row, feature):
        raise HTTPException(
            status_code=403,
            detail=f"Feature '{feature}' not enabled for this company license",
        )

    return license_row