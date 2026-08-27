from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.constants.roles import (
    PERMISSION_MATRIX,
    ROLE_LABELS,
    ROLES,
    assignable_roles_for,
    normalize_role,
)

router = APIRouter(prefix="/v2/roles", tags=["v2-roles"])


@router.get("/")
def list_roles(
    user=Depends(get_current_user),
):
    caller_role = normalize_role(getattr(user, "role", ""))
    roles = sorted(ROLES)
    assignable = assignable_roles_for(caller_role)
    return {
        "roles": roles,
        "assignable_roles": assignable,
        "role_labels": {key: ROLE_LABELS.get(key, key) for key in roles},
        "caller_role": caller_role,
    }


@router.get("/matrix")
def get_roles_matrix(
    user=Depends(get_current_user),
):
    roles = sorted(ROLES)
    return {
        "roles": roles,
        "role_labels": {key: ROLE_LABELS.get(key, key) for key in roles},
        "permissions": [
            {
                "key": key,
                "label": value["label"],
                "roles": value["roles"],
            }
            for key, value in PERMISSION_MATRIX.items()
        ],
    }