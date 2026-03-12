from __future__ import annotations

from typing import Optional
import inspect

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db

router = APIRouter(tags=["units"])

# Import service layer with best-effort compatibility.
try:
    from app.services.units import (  # type: ignore
        list_units,
        get_unit,
        create_unit,
        update_unit,
        delete_unit,
    )
except Exception:
    import importlib

    _units_mod = importlib.import_module("app.services.units")

    list_units = getattr(_units_mod, "list_units", None)
    get_unit = getattr(_units_mod, "get_unit", None)
    create_unit = getattr(_units_mod, "create_unit", None)
    update_unit = getattr(_units_mod, "update_unit", None)
    delete_unit = getattr(_units_mod, "delete_unit", None)


def _require(func, name: str):
    if not callable(func):
        raise HTTPException(status_code=501, detail=f"units service missing: {name}")
    return func


def _param_names(fn) -> set[str]:
    """
    Devuelve SOLO nombres de parámetros reales que acepta la función.
    """
    try:
        sig = inspect.signature(fn)
        return set(sig.parameters.keys())
    except Exception:
        return set()


def _call_compat(fn, /, **kwargs):
    """
    Llama fn pasando SOLO los kwargs que soporte por nombre.
    """
    names = _param_names(fn)
    safe = {k: v for k, v in kwargs.items() if k in names}
    return fn(**safe)


@router.get("/", name="list_units_endpoint")
def list_units_endpoint(
    db: Session = Depends(get_db),
    x_company_id: Optional[str] = Header(default=None, alias="X-Company-Id"),
):
    fn = _require(list_units, "list_units")

    if "company_id" in _param_names(fn) and not x_company_id:
        raise HTTPException(status_code=400, detail="Missing X-Company-Id")

    return _call_compat(fn, db=db, company_id=x_company_id)


@router.get("/{unit_id}", name="get_unit_endpoint")
def get_unit_endpoint(
    unit_id: str,
    db: Session = Depends(get_db),
    x_company_id: Optional[str] = Header(default=None, alias="X-Company-Id"),
):
    fn = _require(get_unit, "get_unit")

    if "company_id" in _param_names(fn) and not x_company_id:
        raise HTTPException(status_code=400, detail="Missing X-Company-Id")

    return _call_compat(fn, unit_id=unit_id, db=db, company_id=x_company_id)


@router.post("/", status_code=status.HTTP_201_CREATED, name="create_unit_endpoint")
def create_unit_endpoint(
    payload: dict,
    db: Session = Depends(get_db),
    x_company_id: Optional[str] = Header(default=None, alias="X-Company-Id"),
):
    fn = _require(create_unit, "create_unit")

    # Inyectar company_id si no viene en el payload
    if x_company_id and "company_id" not in payload:
        payload = {**payload, "company_id": x_company_id}

    if "company_id" in _param_names(fn) and not x_company_id:
        raise HTTPException(status_code=400, detail="Missing X-Company-Id")

    # Solo pasará data si el service realmente la acepta
    return _call_compat(
        fn,
        payload=payload,
        data=payload,
        db=db,
        company_id=x_company_id,
    )


@router.patch("/{unit_id}", name="update_unit_endpoint")
def update_unit_endpoint(
    unit_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    x_company_id: Optional[str] = Header(default=None, alias="X-Company-Id"),
):
    fn = _require(update_unit, "update_unit")

    if x_company_id and "company_id" not in payload:
        payload = {**payload, "company_id": x_company_id}

    if "company_id" in _param_names(fn) and not x_company_id:
        raise HTTPException(status_code=400, detail="Missing X-Company-Id")

    return _call_compat(
        fn,
        unit_id=unit_id,
        payload=payload,
        data=payload,
        db=db,
        company_id=x_company_id,
    )


@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT, name="delete_unit_endpoint")
def delete_unit_endpoint(
    unit_id: str,
    db: Session = Depends(get_db),
    x_company_id: Optional[str] = Header(default=None, alias="X-Company-Id"),
):
    fn = _require(delete_unit, "delete_unit")

    if "company_id" in _param_names(fn) and not x_company_id:
        raise HTTPException(status_code=400, detail="Missing X-Company-Id")

    _call_compat(fn, unit_id=unit_id, db=db, company_id=x_company_id)
    return None