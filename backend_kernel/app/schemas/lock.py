from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class LockOut(BaseModel):
    frap_id: UUID
    locked_at: datetime
    hash_final: str
