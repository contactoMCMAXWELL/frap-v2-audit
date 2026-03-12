from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.models.user import User
from app.schemas.users import UserCreate, UserPatch, UserOut
from app.services.tenant import get_company_id
from app.services.auth import hash_password

router = APIRouter(prefix="/users", tags=["users"])

@router.post("", response_model=UserOut)
def create_user(payload: UserCreate, company_id: UUID = Depends(get_company_id), db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=409, detail="Email already exists")
    row = User(
        company_id=company_id,
        name=payload.name,
        email=payload.email,
        role=payload.role,
        active=payload.active,
        password_hash=hash_password(payload.password) if payload.password else None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.get("", response_model=list[UserOut])
def list_users(company_id: UUID = Depends(get_company_id), db: Session = Depends(get_db)):
    return db.query(User).filter(User.company_id == company_id).order_by(User.created_at.desc()).all()

@router.patch("/{user_id}", response_model=UserOut)
def patch_user(user_id: UUID, payload: UserPatch, company_id: UUID = Depends(get_company_id), db: Session = Depends(get_db)):
    row = db.query(User).filter(User.id == user_id, User.company_id == company_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.name is not None:
        row.name = payload.name
    if payload.role is not None:
        row.role = payload.role
    if payload.active is not None:
        row.active = payload.active
    if payload.password is not None:
        row.password_hash = hash_password(payload.password) if payload.password else None
    db.commit()
    db.refresh(row)
    return row
