from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class RoleCreate(BaseModel):
    name: str
    description: str = ""
    active: bool = True


class RoleOut(RoleCreate):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True