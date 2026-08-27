"""create frap_pediatrics_v2

Revision ID: 20260318_03_v2_pediatrics
Revises: 20260318_02_v2_body_map
Create Date: 2026-03-18

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260318_03_v2_pediatrics"
down_revision = "20260318_02_v2_body_map"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "frap_pediatrics_v2",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),

        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),

        sa.Column("age_group", sa.String(length=50), nullable=False, server_default=""),
        sa.Column("estimated_age_value", sa.String(length=20), nullable=False, server_default=""),
        sa.Column("estimated_age_unit", sa.String(length=20), nullable=False, server_default=""),
        sa.Column("weight_kg", sa.String(length=20), nullable=False, server_default=""),
        sa.Column("broselow_color", sa.String(length=30), nullable=False, server_default=""),
        sa.Column("caregiver_present", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("caregiver_name", sa.String(length=150), nullable=False, server_default=""),
        sa.Column("pediatric_assessment_triangle", sa.String(length=80), nullable=False, server_default=""),
        sa.Column("appearance", sa.Text(), nullable=False, server_default=""),
        sa.Column("work_of_breathing", sa.Text(), nullable=False, server_default=""),
        sa.Column("circulation_to_skin", sa.Text(), nullable=False, server_default=""),
        sa.Column("capillary_refill_seconds", sa.String(length=20), nullable=False, server_default=""),
        sa.Column("blood_glucose_mg_dl", sa.String(length=20), nullable=False, server_default=""),
        sa.Column("pain_scale_flacc", sa.String(length=20), nullable=False, server_default=""),
        sa.Column("immunization_status", sa.String(length=50), nullable=False, server_default=""),
        sa.Column("suspected_abuse", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("temperature_control", sa.String(length=80), nullable=False, server_default=""),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),

        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["intake_id"],
            ["service_intake_v2.id"],
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "intake_id",
            name="uq_frap_pediatrics_v2_intake_id",
        ),
    )

    op.create_index(
        "ix_frap_pediatrics_v2_company_id",
        "frap_pediatrics_v2",
        ["company_id"],
        unique=False,
    )

    op.create_index(
        "ix_frap_pediatrics_v2_intake_id",
        "frap_pediatrics_v2",
        ["intake_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_frap_pediatrics_v2_intake_id",
        table_name="frap_pediatrics_v2",
    )
    op.drop_index(
        "ix_frap_pediatrics_v2_company_id",
        table_name="frap_pediatrics_v2",
    )
    op.drop_table("frap_pediatrics_v2")