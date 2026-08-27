from __future__ import annotations

from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not creds or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = creds.credentials.strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_uuid = UUID(str(user_id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    u = db.query(User).filter(User.id == user_uuid).first()
    if not u or not getattr(u, "active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found/inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return u


def get_company_id(
    user: User = Depends(get_current_user),
    x_company_id: str | None = Header(default=None, alias="X-Company-Id"),
) -> UUID:
    """
    ADMIN:
      siempre usa su propia empresa.

    SUPERADMIN:
      puede operar sobre la empresa enviada en X-Company-Id;
      si no viene header, cae a su company_id base.
    """
    role = str(getattr(user, "role", "") or "").upper()

    if role == "SUPERADMIN":
        raw = x_company_id or getattr(user, "company_id", None)
    else:
        raw = getattr(user, "company_id", None)

    if not raw:
        raise HTTPException(status_code=400, detail="User has no company_id")

    try:
        return UUID(str(raw))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid company_id context")