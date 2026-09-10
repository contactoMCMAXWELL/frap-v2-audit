"""campos de seguridad del participante

Revision ID: 20260910_01_safety_fields
Revises: 20260909_01_event_participant_protection
"""

from alembic import op
import sqlalchemy as sa


revision = "20260910_01_safety_fields"
down_revision = "20260909_01_event_participant_protection"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "event_participant",
        sa.Column("vehicle_plates", sa.String(length=30), nullable=True),
    )
    op.add_column(
        "event_participant_medical_profile",
        sa.Column("uses_anticoagulants", sa.Boolean(), nullable=True),
    )


def downgrade():
    op.drop_column(
        "event_participant_medical_profile",
        "uses_anticoagulants",
    )
    op.drop_column(
        "event_participant",
        "vehicle_plates",
    )
