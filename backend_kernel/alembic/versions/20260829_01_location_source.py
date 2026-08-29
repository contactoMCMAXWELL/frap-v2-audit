"""add location source to service locations

Revision ID: 20260829_01_location_source
Revises: 20260828_01_service_operation_modes
"""

from alembic import op
import sqlalchemy as sa


revision = "20260829_01_location_source"
down_revision = "20260828_01_service_operation_modes"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "service_location_v2",
        sa.Column(
            "location_source",
            sa.String(length=30),
            nullable=False,
            server_default="unknown",
        ),
    )


def downgrade():
    op.drop_column("service_location_v2", "location_source")
