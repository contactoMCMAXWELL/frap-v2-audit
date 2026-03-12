from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Set
from uuid import UUID

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User


DUMMY_COMPANY_ID = UUID("00000000-0000-0000-0000-000000000000")


@dataclass(frozen=True)
class Actor:
    company_id: UUID
    user_id: UUID
    role: str
    name: str = ""
    email: str = ""


def _uuid_or_400(v: Optional[str], header_name: str) -> UUID:
    if not v:
        raise HTTPException(status_code=400, detail=f"Missing header {header_name}")
    try:
        return UUID(str(v))
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid UUID in header {header_name}")


def _load_user_or_401(db: Session, user_id: UUID) -> User:
    q = db.query(User).filter(User.id == user_id)

    # Si el modelo tiene columna "active", la usamos. Si no, seguimos.
    if hasattr(User, "active"):
        q = q.filter(getattr(User, "active") == True)  # noqa: E712

    user = q.first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    return user


def get_actor(
    db: Session = Depends(get_db),
    x_company_id: Optional[str] = Header(default=None, alias="X-Company-Id"),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> Actor:
    """
    Actor multi-tenant (operación):
      - X-Company-Id (REQUERIDO)
      - X-User-Id (REQUERIDO)
    """
    company_id = _uuid_or_400(x_company_id, "X-Company-Id")
    user_id = _uuid_or_400(x_user_id, "X-User-Id")

    user = _load_user_or_401(db, user_id)

    role = getattr(user, "role", None) or "user"
    name = getattr(user, "name", "") or ""
    email = getattr(user, "email", "") or ""

    return Actor(company_id=company_id, user_id=user_id, role=str(role), name=name, email=email)


def get_actor_admin(
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> Actor:
    """
    Actor plataforma (SUPERADMIN):
      - X-User-Id (REQUERIDO)
      - X-Company-Id (NO requerido)

    Devuelve company_id = DUMMY_COMPANY_ID para compatibilidad.
    """
    user_id = _uuid_or_400(x_user_id, "X-User-Id")
    user = _load_user_or_401(db, user_id)

    role = str(getattr(user, "role", None) or "user")
    if role.lower() != "superadmin":
        raise HTTPException(status_code=403, detail="Forbidden")

    name = getattr(user, "name", "") or ""
    email = getattr(user, "email", "") or ""

    return Actor(company_id=DUMMY_COMPANY_ID, user_id=user_id, role=role, name=name, email=email)


def require_roles(*args):
    """Validador de roles (FIJOS) con compatibilidad de uso.

    Soporta 2 estilos:

    1) Dependency (FastAPI):
        actor: Actor = Depends(require_roles("ADMIN", "DISPATCH"))

    2) Inline:
        require_roles(actor, "ADMIN", "DISPATCH")
    """

    # Inline: require_roles(actor, "ADMIN", ...)
    if args and isinstance(args[0], Actor):
        actor: Actor = args[0]
        allowed = {str(r).lower() for r in args[1:] if r}
        if not allowed:
            return actor
        if (actor.role or "").lower() not in allowed:
            raise HTTPException(status_code=403, detail="Forbidden")
        return actor

    # Dependency: require_roles("ADMIN", ...)
    allowed: Set[str] = {str(r).lower() for r in args if r}

    def dep(actor: Actor = Depends(get_actor)) -> Actor:
        if not allowed:
            return actor
        if (actor.role or "").lower() not in allowed:
            raise HTTPException(status_code=403, detail="Forbidden")
        return actor

    return dep
