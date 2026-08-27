from datetime import datetime
from sqlalchemy.orm import Session
from app.models.license import License


class LicenseService:

    @staticmethod
    def get_active_license(db: Session, company_id):

        license = (
            db.query(License)
            .filter(License.company_id == company_id)
            .order_by(License.created_at.desc())
            .first()
        )

        return license

    @staticmethod
    def is_license_valid(license):

        if not license:
            return False

        now = datetime.utcnow()

        if license.status not in ["active", "trial", "grace"]:
            return False

        if license.expires_at and now > license.expires_at:
            return False

        return True