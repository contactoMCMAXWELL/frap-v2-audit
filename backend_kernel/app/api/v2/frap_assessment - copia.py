from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.frap_assessment_v2 import FrapAssessmentV2
from app.schemas.frap_assessment_v2 import FrapAssessmentCreate, FrapAssessmentOut

router = APIRouter(prefix="/v2/frap-assessment", tags=["frap-assessment"])


@router.post("/", response_model=FrapAssessmentOut)
def create_or_update(data: FrapAssessmentCreate, db: Session = Depends(get_db)):
    existing = db.query(FrapAssessmentV2).filter_by(intake_id=data.intake_id).first()

    if existing:
        for k, v in data.dict().items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing

    obj = FrapAssessmentV2(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{intake_id}", response_model=FrapAssessmentOut)
def get(intake_id: str, db: Session = Depends(get_db)):
    return db.query(FrapAssessmentV2).filter_by(intake_id=intake_id).first()