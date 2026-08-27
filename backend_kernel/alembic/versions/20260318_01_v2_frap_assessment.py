"""create frap_assessment_v2

Revision ID: 20260318_01_v2_frap_assessment
Revises: 20260313_03_v2_admin_core_fix
Create Date: 2026-03-18

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260318_01_v2_frap_assessment"
down_revision = "20260313_03_v2_admin_core_fix"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "frap_assessment_v2",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),

        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),

        # Neurológico
        sa.Column("avpu", sa.String(length=10), nullable=True),
        sa.Column("glasgow_eye", sa.Integer(), nullable=True),
        sa.Column("glasgow_verbal", sa.Integer(), nullable=True),
        sa.Column("glasgow_motor", sa.Integer(), nullable=True),

        # SAMPLE
        sa.Column("sample_s", sa.Text(), nullable=True),
        sa.Column("sample_a", sa.Text(), nullable=True),
        sa.Column("sample_m", sa.Text(), nullable=True),
        sa.Column("sample_p", sa.Text(), nullable=True),
        sa.Column("sample_l", sa.Text(), nullable=True),
        sa.Column("sample_e", sa.Text(), nullable=True),

        # Impresión diagnóstica / triage
        sa.Column("impression_primary", sa.Text(), nullable=True),
        sa.Column("impression_secondary", sa.Text(), nullable=True),
        sa.Column("triage", sa.String(length=20), nullable=True),

        # Auditoría
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
            name="uq_frap_assessment_v2_intake_id",
        ),
    )

    op.create_index(
        "ix_frap_assessment_v2_company_id",
        "frap_assessment_v2",
        ["company_id"],
        unique=False,
    )

    op.create_index(
        "ix_frap_assessment_v2_intake_id",
        "frap_assessment_v2",
        ["intake_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_frap_assessment_v2_intake_id",
        table_name="frap_assessment_v2",
    )
    op.drop_index(
        "ix_frap_assessment_v2_company_id",
        table_name="frap_assessment_v2",
    )
    op.drop_table("frap_assessment_v2")