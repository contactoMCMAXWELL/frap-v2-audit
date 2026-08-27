"""create frap_signatures_v2

Revision ID: 20260319_04_v2_signatures
Revises: 20260319_03_company_pdf_config
Create Date: 2026-03-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260319_04_v2_signatures"
down_revision = "20260319_03_company_pdf_config"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "frap_signatures_v2",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("captured_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),

        sa.Column("signature_role", sa.String(length=30), nullable=False),

        sa.Column("signer_name", sa.String(length=150), nullable=False, server_default=""),
        sa.Column("signer_role", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("signer_relation", sa.String(length=100), nullable=False, server_default=""),

        sa.Column("image_base64", sa.Text(), nullable=True),

        sa.Column("refused_to_sign", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("refusal_reason", sa.Text(), nullable=False, server_default=""),

        sa.Column("device_id", sa.String(length=120), nullable=True),
        sa.Column("geo_lat", sa.Float(), nullable=True),
        sa.Column("geo_lng", sa.Float(), nullable=True),
        sa.Column("geo_accuracy_m", sa.Float(), nullable=True),

        sa.Column("meta_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),

        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),

        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["intake_id"], ["service_intake_v2.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["captured_by_user_id"], ["users.id"], ondelete="SET NULL"),

        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("intake_id", "signature_role", name="uq_frap_signatures_v2_intake_role"),
    )

    op.create_index("ix_frap_signatures_v2_company_id", "frap_signatures_v2", ["company_id"], unique=False)
    op.create_index("ix_frap_signatures_v2_intake_id", "frap_signatures_v2", ["intake_id"], unique=False)
    op.create_index("ix_frap_signatures_v2_captured_by_user_id", "frap_signatures_v2", ["captured_by_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_frap_signatures_v2_captured_by_user_id", table_name="frap_signatures_v2")
    op.drop_index("ix_frap_signatures_v2_intake_id", table_name="frap_signatures_v2")
    op.drop_index("ix_frap_signatures_v2_company_id", table_name="frap_signatures_v2")
    op.drop_table("frap_signatures_v2")