from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class UnitCreate(BaseModel):
    code: str
    plate: Optional[str] = None


class UnitPatch(BaseModel):
    code: Optional[str] = None
    plate: Optional[str] = None


class UnitOut(BaseModel):
    id: UUID
    company_id: UUID
    code: str
    # NOTE (Pydantic v2): Optional[T] without a default is still a *required* key.
    # Our DB allows NULL/absent plate, so default it to None to avoid 500s.
    plate: Optional[str] = None

    class Config:
        from_attributes = True
