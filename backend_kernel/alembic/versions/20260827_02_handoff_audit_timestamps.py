"""align handoff administrative timestamp defaults

Revision ID: 20260827_02_handoff_audit_timestamps
Revises: 20260827_01_frap_retrospective
Create Date: 2026-08-27

Adds database defaults for future handoff records without modifying
historical NULL audit timestamps.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260827_02_handoff_audit_timestamps"
down_revision = "20260827_01_frap_retrospective"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "frap_handoff_v2",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=True,
        server_default=sa.text("now()"),
    )

    op.alter_column(
        "frap_handoff_v2",
        "updated_at",
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=True,
        server_default=sa.text("now()"),
    )


def downgrade():
    op.alter_column(
        "frap_handoff_v2",
        "updated_at",
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=True,
        server_default=None,
    )

    op.alter_column(
        "frap_handoff_v2",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=True,
        server_default=None,
    )
