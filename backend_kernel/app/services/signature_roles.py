from fastapi import HTTPException

VALID_ROLES = {"responsable", "tripulacion", "receptor"}

def validate_role(role: str) -> str:
    r = (role or "").strip().lower()
    if r not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Use one of: {sorted(VALID_ROLES)}")
    return r
