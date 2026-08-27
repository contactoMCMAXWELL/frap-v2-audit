from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.license import LicenseCreate, LicenseOut
from app.models.license import License

router = APIRouter(prefix="/v2/licenses", tags=["licenses"])


@router.post("/")
def create_license(data: LicenseCreate, db: Session = Depends(get_db)):

    license = License(**data.dict())

    db.add(license)
    db.commit()
    db.refresh(license)

    return license


@router.get("/company/{company_id}", response_model=LicenseOut)
def get_company_license(company_id, db: Session = Depends(get_db)):

    license = (
        db.query(License)
        .filter(License.company_id == company_id)
        .first()
    )

    return license