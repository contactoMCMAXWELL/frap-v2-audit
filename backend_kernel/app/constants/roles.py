"""Roles FIJOS del sistema (MVP empresarial).

Requerimiento:
1) FIJO: no se administran roles desde BD en esta etapa.
2) ÚNICO GLOBAL: usuarios son únicos por email; los roles dependen de su cuenta.
"""

from __future__ import annotations

from typing import Final, FrozenSet


ROLES: Final[FrozenSet[str]] = frozenset(
    {
        # Plataforma
        "SUPERADMIN",  # administra empresas y usuarios (global)

        # Empresa
        "ADMIN",      # configuración + catálogos + usuarios + unidades
        "DISPATCH",   # despacho / CAD ligero
        "PARAMEDIC",  # FRAP móvil
        "DOCTOR",     # médico (opcional)
        "RECEIVER_MD",  # médico receptor (opcional)
        "AUDITOR",    # solo lectura + trazabilidad
    }
)


def is_valid_role(role: str) -> bool:
    return role in ROLES
