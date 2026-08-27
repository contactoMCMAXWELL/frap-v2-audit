"""create company_pdf_config

Revision ID: 20260319_03_company_pdf_config
Revises: 20260319_02_v2_pregnancy
Create Date: 2026-03-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260319_03_company_pdf_config"
down_revision = "20260319_02_v2_pregnancy"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "company_pdf_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),

        sa.Column("include_legal_legend", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("legal_legend_text", sa.Text(), nullable=True),

        sa.Column("include_signature_legend", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("signature_legend_text", sa.Text(), nullable=True),

        sa.Column("include_footer_legend", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("footer_legend_text", sa.Text(), nullable=True),

        sa.Column("include_privacy_notice", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("privacy_notice_text", sa.Text(), nullable=True),

        sa.Column("include_insurance_legend", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("insurance_legend_text", sa.Text(), nullable=True),

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

        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", name="uq_company_pdf_config_company_id"),
    )

    op.create_index("ix_company_pdf_config_company_id", "company_pdf_config", ["company_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_company_pdf_config_company_id", table_name="company_pdf_config")
    op.drop_table("company_pdf_config")