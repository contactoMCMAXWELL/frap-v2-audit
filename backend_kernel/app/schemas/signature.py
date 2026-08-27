from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class SignatureIn(BaseModel):
    signer_name: str
    image_base64: str
    device_id: Optional[str] = None
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    geo_accuracy_m: Optional[float] = None
    signed_at: Optional[datetime] = None


class SignatureOut(BaseModel):
    id: UUID
    frap_id: UUID
    role: str
    signer_name: str
    signed_at: Optional[datetime]

    class Config:
        from_attributes = True
