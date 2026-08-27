from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_db
from app.db.session import get_db as session_get_db
from app.models.user import User
from app.schemas.users import UserCreate, UserPatch, UserOut
from app.services.auth import hash_password
from app.services.company_license_service import CompanyLicenseService

router = APIRouter(prefix="/users", tags=["users"])


def _enforce_user_limit(db: Session, company_id: UUID) -> None:
    license_row = CompanyLicenseService.ensure_license(db, company_id)
    usage = CompanyLicenseService.get_usage_summary(db, company_id)

    max_users = int(getattr(license_row, "max_users", 0) or 0)
    users_count = int(usage.get("users_count", 0) or 0)

    if max_users > 0 and users_count >= max_users:
        raise HTTPException(
            status_code=403,
            detail=f"User limit reached for company license ({users_count}/{max_users})",
        )


@router.post("/", response_model=UserOut)
def create_user(
    payload: UserCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db),
):
    exists = (
        db.query(User)
        .filter(User.email == payload.email)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="email already exists")

    user_active = bool(getattr(payload, "active", True))
    if user_active:
        _enforce_user_limit(db, company_id)

    obj = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        company_id=company_id,
        active=user_active,
    )

    if hasattr(payload, "name") and hasattr(obj, "name"):
        obj.name = payload.name

    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/", response_model=list[UserOut])
def list_users(
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(session_get_db),
):
    return db.query(User).filter(User.company_id == company_id).all()


@router.patch("/{user_id}", response_model=UserOut)
def patch_user(
    user_id: UUID,
    payload: UserPatch,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(session_get_db),
):
    obj = (
        db.query(User)
        .filter(User.id == user_id, User.company_id == company_id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="user not found")

    data = payload.model_dump(exclude_unset=True)

    if "active" in data:
        new_active = bool(data["active"])
        current_active = bool(getattr(obj, "active", True))
        if new_active and not current_active:
            _enforce_user_limit(db, company_id)

    for k, v in data.items():
        if k == "password":
            obj.password_hash = hash_password(v)
        elif hasattr(obj, k):
            setattr(obj, k, v)

    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj