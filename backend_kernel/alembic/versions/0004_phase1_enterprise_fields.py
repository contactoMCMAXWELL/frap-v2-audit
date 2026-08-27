"""0004_phase1_enterprise_fields

Revision ID: 0004_phase1_enterprise_fields
Revises: 0003_add_service_dispatch_timestamps
Create Date: 2026-02-13
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_phase1_enterprise_fields"
down_revision = "0003_add_service_dispatch_timestamps"
branch_labels = None
depends_on = None


def upgrade():
    # companies
    op.add_column("companies", sa.Column("rfc", sa.String(length=20), nullable=True))
    op.add_column("companies", sa.Column("address", sa.String(length=255), nullable=True))
    op.add_column("companies", sa.Column("phone", sa.String(length=30), nullable=True))
    op.add_column("companies", sa.Column("logo_url", sa.String(length=255), nullable=True))

    # users
    op.add_column("users", sa.Column("name", sa.String(length=200), nullable=True))
    op.add_column("users", sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    # normalize default role to ADMIN (no breaking; just server-side default)
    op.alter_column("users", "role", existing_type=sa.String(length=30), nullable=False, server_default="ADMIN")

    # units
    op.add_column("units", sa.Column("type", sa.String(length=10), nullable=True))
    op.add_column("units", sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")))

    # service_assignments (history)
    op.create_table(
        "service_assignments",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("service_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("unit_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("units.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade():
    op.drop_table("service_assignments")
    op.drop_column("units", "active")
    op.drop_column("units", "type")
    op.drop_column("users", "active")
    op.drop_column("users", "name")
    op.drop_column("companies", "logo_url")
    op.drop_column("companies", "phone")
    op.drop_column("companies", "address")
    op.drop_column("companies", "rfc")
