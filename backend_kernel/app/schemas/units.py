from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class UnitCreate(BaseModel):
    code: str
    type: Optional[str] = None  # BLS / ALS
    plate: Optional[str] = None
    active: bool = True

class UnitPatch(BaseModel):
    code: Optional[str] = None
    type: Optional[str] = None
    plate: Optional[str] = None
    active: Optional[bool] = None

class UnitOut(BaseModel):
    id: UUID
    company_id: UUID
    code: str
    # NOTE (Pydantic v2): Optional[T] without a default is still required.
    type: Optional[str] = None
    plate: Optional[str] = None
    active: bool

    class Config:
        from_attributes = True
