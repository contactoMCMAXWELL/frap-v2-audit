from __future__ import annotations

from typing import Final, FrozenSet

ROLES: Final[FrozenSet[str]] = frozenset(
    {
        "SUPERADMIN",
        "ADMIN",
        "DISPATCH",
        "PARAMEDIC",
        "DOCTOR",
        "UNIT",
        "RECEIVER_MD",
        "AUDITOR",
    }
)

ROLE_LABELS: Final[dict[str, str]] = {
    "SUPERADMIN": "Superadmin",
    "ADMIN": "Admin",
    "DISPATCH": "Dispatch",
    "PARAMEDIC": "Paramédico",
    "DOCTOR": "Médico",
    "UNIT": "Unidad",
    "RECEIVER_MD": "Médico receptor",
    "AUDITOR": "Auditor",
}

PERMISSION_MATRIX: Final[dict[str, dict[str, object]]] = {
    "create_service": {
        "label": "Crear servicio",
        "roles": ["ADMIN", "DISPATCH"],
    },
    "assign_unit": {
        "label": "Asignar unidad",
        "roles": ["ADMIN", "DISPATCH"],
    },
    "edit_frap_clinical": {
        "label": "Editar FRAP clínico",
        "roles": ["ADMIN", "PARAMEDIC"],
    },
    "sign_receiver": {
        "label": "Firmar receptor",
        "roles": ["DOCTOR", "RECEIVER_MD", "ADMIN"],
    },
    "lock_frap": {
        "label": "Lock FRAP",
        "roles": ["ADMIN", "PARAMEDIC"],
    },
    "view_audit": {
        "label": "Ver auditoría",
        "roles": ["ADMIN", "AUDITOR"],
    },
}

CALLER_ASSIGNABLE_ROLES: Final[dict[str, list[str]]] = {
    "SUPERADMIN": [
        "SUPERADMIN",
        "ADMIN",
        "DISPATCH",
        "PARAMEDIC",
        "DOCTOR",
        "UNIT",
        "RECEIVER_MD",
        "AUDITOR",
    ],
    "ADMIN": [
        "DISPATCH",
        "PARAMEDIC",
        "DOCTOR",
        "UNIT",
        "RECEIVER_MD",
        "AUDITOR",
    ],
}

def is_valid_role(role: str) -> bool:
    return str(role or "").upper() in ROLES

def normalize_role(role: str) -> str:
    return str(role or "").strip().upper()

def role_label(role: str) -> str:
    value = normalize_role(role)
    return ROLE_LABELS.get(value, value)

def roles_for_permission(permission_key: str) -> list[str]:
    entry = PERMISSION_MATRIX.get(permission_key, {})
    roles = entry.get("roles", [])
    return [normalize_role(x) for x in roles]

def has_permission(role: str, permission_key: str) -> bool:
    return normalize_role(role) in roles_for_permission(permission_key)

def assignable_roles_for(caller_role: str) -> list[str]:
    role = normalize_role(caller_role)
    return list(CALLER_ASSIGNABLE_ROLES.get(role, []))