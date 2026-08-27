from fastapi import Header, HTTPException
from uuid import UUID

def get_company_id(x_company_id: str | None = Header(default=None, alias="X-Company-Id")) -> UUID:
    if not x_company_id:
        raise HTTPException(status_code=400, detail="Missing header X-Company-Id")
    try:
        return UUID(x_company_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid X-Company-Id (must be UUID)")
