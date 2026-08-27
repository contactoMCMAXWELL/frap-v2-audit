"""v2 core: company licenses + service intake

Revision ID: 20260312_01_v2_core
Revises: 0005_frap_lock_hash_fields
Create Date: 2026-03-12
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260312_01_v2_core"
down_revision = "0005_frap_lock_hash_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "company_licenses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_code", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("max_users", sa.Integer(), nullable=False),
        sa.Column("max_units", sa.Integer(), nullable=False),
        sa.Column("max_services_month", sa.Integer(), nullable=False),
        sa.Column("features_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("grace_days", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("company_id"),
    )
    op.create_index(op.f("ix_company_licenses_company_id"), "company_licenses", ["company_id"], unique=False)

    op.create_table(
        "service_intake_v2",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("service_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("incident_number", sa.String(length=50), nullable=False),
        sa.Column("service_type", sa.String(length=60), nullable=False),
        sa.Column("service_subtype", sa.String(length=60), nullable=False),
        sa.Column("priority_operational", sa.Integer(), nullable=False),
        sa.Column("priority_clinical", sa.String(length=30), nullable=False),
        sa.Column("call_source", sa.String(length=50), nullable=False),
        sa.Column("caller_name", sa.String(length=120), nullable=False),
        sa.Column("caller_phone", sa.String(length=40), nullable=False),
        sa.Column("location_text", sa.String(length=255), nullable=False),
        sa.Column("location_reference", sa.String(length=255), nullable=False),
        sa.Column("lat", sa.String(length=40), nullable=True),
        sa.Column("lng", sa.String(length=40), nullable=True),
        sa.Column("patient_count_estimated", sa.Integer(), nullable=False),
        sa.Column("scene_risk", sa.String(length=50), nullable=False),
        sa.Column("destination_suggested", sa.String(length=120), nullable=False),
        sa.Column("payer_type", sa.String(length=50), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("extra_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="SET NULL"),
    )
    op.create_index(op.f("ix_service_intake_v2_company_id"), "service_intake_v2", ["company_id"], unique=False)
    op.create_index(op.f("ix_service_intake_v2_service_id"), "service_intake_v2", ["service_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_service_intake_v2_service_id"), table_name="service_intake_v2")
    op.drop_index(op.f("ix_service_intake_v2_company_id"), table_name="service_intake_v2")
    op.drop_table("service_intake_v2")

    op.drop_index(op.f("ix_company_licenses_company_id"), table_name="company_licenses")
    op.drop_table("company_licenses")