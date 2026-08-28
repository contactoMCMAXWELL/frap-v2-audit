from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException, status


RETROSPECTIVE_CAPTURE_MODE = "retrospective"
REALTIME_CAPTURE_MODE = "realtime"

RETROSPECTIVE_ROLES = {"SUPERADMIN", "ADMIN"}


def user_role(user: Any) -> str:
    return str(getattr(user, "role", "") or "").strip().upper()


def is_retrospective_intake(intake: Any) -> bool:
    capture_mode = str(
        getattr(intake, "capture_mode", REALTIME_CAPTURE_MODE)
        or REALTIME_CAPTURE_MODE
    ).strip().lower()

    return capture_mode == RETROSPECTIVE_CAPTURE_MODE


def require_retrospective_role(user: Any) -> None:
    if user_role(user) not in RETROSPECTIVE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo ADMIN o SUPERADMIN puede realizar captura retrospectiva",
        )


def require_retrospective_write_access(intake: Any, user: Any) -> None:
    if is_retrospective_intake(intake):
        require_retrospective_role(user)


def validate_capture_mode(capture_mode: str | None) -> str:
    normalized = str(capture_mode or REALTIME_CAPTURE_MODE).strip().lower()

    if normalized not in {
        REALTIME_CAPTURE_MODE,
        RETROSPECTIVE_CAPTURE_MODE,
    }:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="capture_mode inválido",
        )

    return normalized


def require_retrospective_timestamp(
    *,
    intake: Any,
    value: datetime | None,
    field_name: str,
) -> None:
    if is_retrospective_intake(intake) and value is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"{field_name} es obligatorio "
                "en captura retrospectiva"
            ),
        )


def validate_semantic_timestamp(
    *,
    intake: Any,
    user: Any,
    value: datetime | None,
    field_name: str,
) -> datetime | None:
    """
    Un timestamp semántico/histórico enviado por el cliente sólo puede
    persistirse cuando el intake es retrospectivo y el usuario es
    ADMIN/SUPERADMIN.

    created_at nunca se modifica aquí.
    """

    if value is None:
        return None

    if not is_retrospective_intake(intake):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"{field_name} sólo puede declararse "
                "en captura retrospectiva"
            ),
        )

    require_retrospective_role(user)

    return value
