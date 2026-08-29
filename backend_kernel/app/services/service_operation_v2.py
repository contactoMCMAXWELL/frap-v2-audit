from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from fastapi import HTTPException

from app.models.service_intake_v2 import ServiceIntakeV2
from app.schemas.v2.service_location import ServiceLocationV2Create


OPERATION_MODES = {"scene", "transfer", "standby"}
LOCATION_ROLES = {"scene", "origin", "destination", "standby"}

STANDBY_BILLING_MODES = {"included", "additional", "mixed"}
BILLING_SCOPES = {"included_in_standby", "additional_charge"}

COVERAGE_WITHIN = "within_coverage"
COVERAGE_OUTSIDE = "outside_coverage"


def normalize_operation_mode(value: str | None) -> str:
    mode = str(value or "scene").strip().lower()

    if mode not in OPERATION_MODES:
        raise HTTPException(
            status_code=422,
            detail="operation_mode inválido",
        )

    return mode


def validate_locations(
    operation_mode: str,
    locations: Iterable[ServiceLocationV2Create],
) -> list[ServiceLocationV2Create]:
    rows = list(locations or [])

    role_counts: dict[str, int] = {}

    for location in rows:
        role = str(location.location_role or "").strip().lower()

        if role not in LOCATION_ROLES:
            raise HTTPException(
                status_code=422,
                detail=f"location_role inválido: {role or '(vacío)'}",
            )

        location.location_role = role
        role_counts[role] = role_counts.get(role, 0) + 1

        if not (
            str(location.name or "").strip()
            or str(location.address_text or "").strip()
            or location.lat is not None
            or location.lng is not None
        ):
            raise HTTPException(
                status_code=422,
                detail="Cada ubicación debe incluir nombre, dirección o coordenadas",
            )

        if (location.lat is None) != (location.lng is None):
            raise HTTPException(
                status_code=422,
                detail="Latitud y longitud deben capturarse juntas",
            )

    allowed_roles = {
        "scene": {"scene"},
        "transfer": {"origin", "destination"},
        "standby": {"standby"},
    }[operation_mode]

    unexpected_roles = set(role_counts) - allowed_roles
    if unexpected_roles:
        raise HTTPException(
            status_code=422,
            detail=(
                "La modalidad "
                f"{operation_mode} no admite location_role: "
                + ", ".join(sorted(unexpected_roles))
            ),
        )

    if operation_mode == "scene":
        if role_counts.get("scene", 0) != 1:
            raise HTTPException(
                status_code=422,
                detail="Atención en sitio requiere exactamente una ubicación scene",
            )

    elif operation_mode == "transfer":
        if role_counts.get("origin", 0) != 1:
            raise HTTPException(
                status_code=422,
                detail="Traslado requiere exactamente una ubicación origin",
            )

        if role_counts.get("destination", 0) != 1:
            raise HTTPException(
                status_code=422,
                detail="Traslado requiere exactamente una ubicación destination",
            )

    elif operation_mode == "standby":
        if role_counts.get("standby", 0) < 1:
            raise HTTPException(
                status_code=422,
                detail="Guardia requiere al menos una ubicación standby",
            )

    return rows


def validate_standby_fields(
    operation_mode: str,
    standby_event_name: str | None,
    standby_starts_at: datetime | None,
    standby_ends_at: datetime | None,
    standby_billing_mode: str | None,
) -> str | None:
    if operation_mode != "standby":
        if any(
            [
                str(standby_event_name or "").strip(),
                standby_starts_at is not None,
                standby_ends_at is not None,
                str(standby_billing_mode or "").strip(),
            ]
        ):
            raise HTTPException(
                status_code=422,
                detail="Los campos standby_* sólo aplican a una guardia",
            )

        return None

    if not str(standby_event_name or "").strip():
        raise HTTPException(
            status_code=422,
            detail="standby_event_name es obligatorio en una guardia",
        )

    if standby_starts_at is None:
        raise HTTPException(
            status_code=422,
            detail="standby_starts_at es obligatorio en una guardia",
        )

    if standby_ends_at is None:
        raise HTTPException(
            status_code=422,
            detail="standby_ends_at es obligatorio en una guardia",
        )

    if standby_ends_at < standby_starts_at:
        raise HTTPException(
            status_code=422,
            detail="standby_ends_at no puede ser anterior a standby_starts_at",
        )

    billing_mode = str(standby_billing_mode or "").strip().lower()

    if billing_mode not in STANDBY_BILLING_MODES:
        raise HTTPException(
            status_code=422,
            detail="standby_billing_mode inválido",
        )

    return billing_mode


def validate_parent_standby(
    *,
    parent: ServiceIntakeV2 | None,
    operation_mode: str,
) -> None:
    if parent is None:
        return

    if str(parent.operation_mode or "").strip().lower() != "standby":
        raise HTTPException(
            status_code=422,
            detail="parent_intake_id debe corresponder a una guardia",
        )

    if operation_mode == "standby":
        raise HTTPException(
            status_code=422,
            detail="Una guardia no puede ser evento hijo de otra guardia",
        )


def resolve_billing_scope(
    *,
    parent: ServiceIntakeV2 | None,
    requested_scope: str | None,
) -> str | None:
    if parent is None:
        if requested_scope is not None:
            raise HTTPException(
                status_code=422,
                detail="billing_scope sólo aplica a eventos dentro de una guardia",
            )

        return None

    parent_mode = str(parent.standby_billing_mode or "").strip().lower()

    if parent_mode == "included":
        return "included_in_standby"

    if parent_mode == "additional":
        return "additional_charge"

    if parent_mode == "mixed":
        scope = str(requested_scope or "").strip().lower()

        if scope not in BILLING_SCOPES:
            raise HTTPException(
                status_code=422,
                detail=(
                    "billing_scope es obligatorio para eventos de una guardia "
                    "con modalidad comercial mixed"
                ),
            )

        return scope

    raise HTTPException(
        status_code=422,
        detail="La guardia padre no tiene una modalidad comercial válida",
    )


def _as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def evaluate_coverage(
    *,
    parent: ServiceIntakeV2 | None,
    event_time: datetime,
) -> tuple[str | None, datetime | None]:
    if parent is None:
        return None, None

    if parent.standby_starts_at is None or parent.standby_ends_at is None:
        raise HTTPException(
            status_code=422,
            detail="La guardia padre no tiene una ventana de cobertura válida",
        )

    starts_at = _as_aware_utc(parent.standby_starts_at)
    ends_at = _as_aware_utc(parent.standby_ends_at)
    evaluated_event_time = _as_aware_utc(event_time)

    status = (
        COVERAGE_WITHIN
        if starts_at <= evaluated_event_time <= ends_at
        else COVERAGE_OUTSIDE
    )

    return status, datetime.now(timezone.utc)


def primary_location(
    *,
    operation_mode: str,
    locations: list[ServiceLocationV2Create],
) -> ServiceLocationV2Create:
    preferred_role = {
        "scene": "scene",
        "transfer": "origin",
        "standby": "standby",
    }[operation_mode]

    for row in locations:
        if row.location_role == preferred_role:
            return row

    raise HTTPException(
        status_code=422,
        detail="No fue posible determinar la ubicación principal",
    )


def legacy_location_values(
    location: ServiceLocationV2Create,
) -> tuple[str, str, str | None, str | None]:
    location_text = (
        str(location.name or "").strip()
        or str(location.address_text or "").strip()
    )

    location_reference = str(location.reference or "").strip()

    lat = str(location.lat) if location.lat is not None else None
    lng = str(location.lng) if location.lng is not None else None

    return location_text, location_reference, lat, lng
