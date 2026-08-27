from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.unit import Unit
from app.services.company_license_service import CompanyLicenseService


def _unit_is_active_value(value: Any) -> bool:
    if value is None:
        return True
    return bool(value)


def _current_active_units_count(db: Session, company_id: UUID) -> int:
    rows = db.query(Unit).filter(Unit.company_id == company_id).all()

    count = 0
    for row in rows:
        if _unit_is_active_value(getattr(row, "active", True)):
            count += 1
    return count


def _enforce_unit_limit(db: Session, company_id: UUID) -> None:
    license_row = CompanyLicenseService.ensure_license(db, company_id)

    max_units = int(getattr(license_row, "max_units", 0) or 0)
    active_units_count = _current_active_units_count(db, company_id)

    if max_units > 0 and active_units_count >= max_units:
        raise HTTPException(
            status_code=403,
            detail=f"Unit limit reached for company license ({active_units_count}/{max_units})",
        )


def _payload_to_dict(payload: Any) -> dict:
    if isinstance(payload, dict):
        return payload
    if hasattr(payload, "model_dump"):
        return payload.model_dump(exclude_unset=True)
    return {}


def _set_if_present(obj: Unit, data: dict, field: str) -> None:
    if field in data and hasattr(obj, field):
        setattr(obj, field, data[field])


def list_units(db: Session, company_id: UUID):
    return (
        db.query(Unit)
        .filter(Unit.company_id == company_id)
        .order_by(Unit.created_at.desc())
        .all()
    )


def get_unit(db: Session, company_id: UUID, unit_id: str):
    obj = (
        db.query(Unit)
        .filter(Unit.company_id == company_id, Unit.id == unit_id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Unit not found")
    return obj


def create_unit(db: Session, company_id: UUID, payload: Any, actor_id: UUID | None = None):
    data = _payload_to_dict(payload)

    unit_active = _unit_is_active_value(data.get("active", True))
    if unit_active:
        _enforce_unit_limit(db, company_id)

    obj = Unit()

    for field in [
        "name",
        "code",
        "unit_type",
        "plate",
        "brand",
        "model",
        "year",
        "serial_number",
        "radio_code",
        "status",
        "base_name",
        "notes",
    ]:
        _set_if_present(obj, data, field)

    if hasattr(obj, "company_id"):
        setattr(obj, "company_id", company_id)

    if hasattr(obj, "active"):
        setattr(obj, "active", unit_active)

    if actor_id and hasattr(obj, "created_by"):
        setattr(obj, "created_by", actor_id)

    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_unit(db: Session, company_id: UUID, unit_id: str, payload: Any):
    obj = (
        db.query(Unit)
        .filter(Unit.company_id == company_id, Unit.id == unit_id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Unit not found")

    data = _payload_to_dict(payload)

    if "active" in data and hasattr(obj, "active"):
        new_active = _unit_is_active_value(data["active"])
        current_active = _unit_is_active_value(getattr(obj, "active", True))

        if new_active and not current_active:
            _enforce_unit_limit(db, company_id)

    for field in [
        "name",
        "code",
        "unit_type",
        "plate",
        "brand",
        "model",
        "year",
        "serial_number",
        "radio_code",
        "status",
        "base_name",
        "notes",
        "active",
    ]:
        _set_if_present(obj, data, field)

    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete_unit(db: Session, company_id: UUID, unit_id: str):
    obj = (
        db.query(Unit)
        .filter(Unit.company_id == company_id, Unit.id == unit_id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Unit not found")

    db.delete(obj)
    db.commit()
    return None