from __future__ import annotations

from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.company_license import CompanyLicense
from app.models.service_intake_v2 import ServiceIntakeV2
from app.models.unit import Unit
from app.models.user import User


class CompanyLicenseService:
    @staticmethod
    def _utcnow() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _as_aware(value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    @staticmethod
    def normalize_features(features: dict | None) -> dict:
        if not features:
            return {}

        normalized: dict[str, bool] = {}

        for key, value in features.items():
            normalized_key = str(key).strip().lower()

            if normalized_key in {"frap_clinical", "frap_clinical_v2"}:
                normalized_key = "clinical"

            normalized[normalized_key] = bool(value)

        return normalized

    @staticmethod
    def get_current_license(db: Session, company_id):
        return (
            db.query(CompanyLicense)
            .filter(CompanyLicense.company_id == company_id)
            .order_by(CompanyLicense.created_at.desc())
            .first()
        )

    @staticmethod
    def ensure_license(db: Session, company_id):
        license_row = CompanyLicenseService.get_current_license(db, company_id)

        if license_row:
            return license_row

        license_row = CompanyLicense(
            company_id=company_id,
            plan_code="TRIAL",
            status="trial",
            starts_at=CompanyLicenseService._utcnow(),
            ends_at=None,
            max_users=5,
            max_units=2,
            max_services_month=100,
            grace_days=7,
            active=True,
            features_json={
                "dispatch": True,
                "timeline": True,
                "clinical": True,
            },
            notes="",
        )

        db.add(license_row)
        db.commit()
        db.refresh(license_row)

        return license_row

    @staticmethod
    def get_usage_summary(db: Session, company_id):
        users_count = (
            db.query(func.count(User.id))
            .filter(User.company_id == company_id)
            .scalar()
        )

        units_count = (
            db.query(func.count(Unit.id))
            .filter(Unit.company_id == company_id)
            .scalar()
        )

        month_start = datetime.utcnow().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )

        services_month = (
            db.query(func.count(ServiceIntakeV2.id))
            .filter(ServiceIntakeV2.company_id == company_id)
            .filter(ServiceIntakeV2.created_at >= month_start)
            .scalar()
        )

        return {
            "users_count": int(users_count or 0),
            "units_count": int(units_count or 0),
            "services_month_count": int(services_month or 0),
        }

    @staticmethod
    def get_grace_until(license_row: CompanyLicense | None) -> datetime | None:
        if not license_row:
            return None

        ends_at = CompanyLicenseService._as_aware(getattr(license_row, "ends_at", None))
        grace_days = int(getattr(license_row, "grace_days", 0) or 0)

        if not ends_at or grace_days <= 0:
            return None

        return ends_at + timedelta(days=grace_days)

    @staticmethod
    def get_effective_status(license_row: CompanyLicense | None) -> str:
        if not license_row:
            return "inactive"

        if not bool(getattr(license_row, "active", True)):
            return "inactive"

        status = str(getattr(license_row, "status", "") or "").strip().lower()

        if status in {"suspended", "cancelled", "inactive"}:
            return status

        now = CompanyLicenseService._utcnow()
        starts_at = CompanyLicenseService._as_aware(getattr(license_row, "starts_at", None))
        ends_at = CompanyLicenseService._as_aware(getattr(license_row, "ends_at", None))

        if starts_at and now < starts_at:
            return "scheduled"

        base_status = "trial" if status == "trial" else "active"

        if not ends_at:
            return base_status

        if now <= ends_at:
            return base_status

        grace_until = CompanyLicenseService.get_grace_until(license_row)
        if grace_until and now <= grace_until:
            return "grace"

        return "expired"

    @staticmethod
    def is_active_effective(license_row: CompanyLicense | None) -> bool:
        return CompanyLicenseService.get_effective_status(license_row) in {
            "active",
            "trial",
            "grace",
        }

    @staticmethod
    def get_days_remaining(license_row: CompanyLicense | None) -> int | None:
        if not license_row:
            return None

        effective_status = CompanyLicenseService.get_effective_status(license_row)
        now = CompanyLicenseService._utcnow()

        target = None

        if effective_status in {"trial", "active"}:
            target = CompanyLicenseService._as_aware(getattr(license_row, "ends_at", None))
        elif effective_status == "grace":
            target = CompanyLicenseService.get_grace_until(license_row)
        elif effective_status == "scheduled":
            target = CompanyLicenseService._as_aware(getattr(license_row, "starts_at", None))

        if not target:
            return None

        delta = (target - now).total_seconds()
        if delta <= 0:
            return 0

        return int(ceil(delta / 86400.0))

    @staticmethod
    def to_dict(license_row: CompanyLicense | None) -> dict | None:
        if not license_row:
            return None

        return {
            "id": license_row.id,
            "company_id": license_row.company_id,
            "plan_code": license_row.plan_code,
            "status": license_row.status,
            "starts_at": license_row.starts_at,
            "ends_at": license_row.ends_at,
            "max_users": license_row.max_users,
            "max_units": license_row.max_units,
            "max_services_month": license_row.max_services_month,
            "grace_days": license_row.grace_days,
            "active": bool(getattr(license_row, "active", True)),
            "features_json": license_row.features_json or {},
            "notes": license_row.notes,
            "created_at": license_row.created_at,
            "updated_at": getattr(license_row, "updated_at", None),
        }

    @staticmethod
    def get_license_summary(db: Session, company_id: Any) -> dict:
        license_row = CompanyLicenseService.ensure_license(db, company_id)
        usage = CompanyLicenseService.get_usage_summary(db, company_id)

        max_users = int(getattr(license_row, "max_users", 0) or 0)
        max_units = int(getattr(license_row, "max_units", 0) or 0)
        max_services = int(getattr(license_row, "max_services_month", 0) or 0)

        users_percent = (usage["users_count"] / max_users * 100.0) if max_users > 0 else 0.0
        units_percent = (usage["units_count"] / max_units * 100.0) if max_units > 0 else 0.0
        services_percent = (
            usage["services_month_count"] / max_services * 100.0
        ) if max_services > 0 else 0.0

        warnings: list[str] = []
        if users_percent > 80:
            warnings.append("users limit above 80%")
        if units_percent > 80:
            warnings.append("units limit above 80%")
        if services_percent > 80:
            warnings.append("services limit above 80%")

        return {
            "license": CompanyLicenseService.to_dict(license_row),
            "effective_status": CompanyLicenseService.get_effective_status(license_row),
            "starts_at": getattr(license_row, "starts_at", None),
            "ends_at": getattr(license_row, "ends_at", None),
            "grace_until": CompanyLicenseService.get_grace_until(license_row),
            "days_remaining": CompanyLicenseService.get_days_remaining(license_row),
            "is_expired": CompanyLicenseService.get_effective_status(license_row) == "expired",
            "in_grace": CompanyLicenseService.get_effective_status(license_row) == "grace",
            "features": CompanyLicenseService.normalize_features(
                getattr(license_row, "features_json", None)
            ),
            "usage": {
                **usage,
                "users_percent": users_percent,
                "units_percent": units_percent,
                "services_percent": services_percent,
            },
            "warnings": warnings,
        }