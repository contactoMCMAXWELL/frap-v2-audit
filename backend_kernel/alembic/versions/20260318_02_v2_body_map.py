"""create frap_body_map_v2

Revision ID: 20260318_02_v2_body_map
Revises: 20260318_01_v2_frap_assessment
Create Date: 2026-03-18

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260318_02_v2_body_map"
down_revision = "20260318_01_v2_frap_assessment"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "frap_body_map_v2",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),

        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),

        sa.Column("status", sa.String(length=30), nullable=True),
        sa.Column("anterior_regions", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("posterior_regions", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("injuries", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),

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
            name="uq_frap_body_map_v2_intake_id",
        ),
    )

    op.create_index(
        "ix_frap_body_map_v2_company_id",
        "frap_body_map_v2",
        ["company_id"],
        unique=False,
    )

    op.create_index(
        "ix_frap_body_map_v2_intake_id",
        "frap_body_map_v2",
        ["intake_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_frap_body_map_v2_intake_id",
        table_name="frap_body_map_v2",
    )
    op.drop_index(
        "ix_frap_body_map_v2_company_id",
        table_name="frap_body_map_v2",
    )
    op.drop_table("frap_body_map_v2")