# app/models/common.py
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column


def uuid_pk():
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def created_at_col():
    return mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


def updated_at_col():
    # server_default sets initial value; onupdate updates it on UPDATE statements.
    return mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
