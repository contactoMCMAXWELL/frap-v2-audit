"""avisos de privacidad versionados por empresa

Revision ID: 20260910_02_company_privacy_notice
Revises: 20260910_01_safety_fields
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260910_02_company_privacy_notice"
down_revision = "20260910_01_safety_fields"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "company_privacy_notice",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="DRAFT", nullable=False),
        sa.Column("title", sa.String(length=180), server_default="Aviso de Privacidad", nullable=False),
        sa.Column("content", sa.Text(), server_default="", nullable=False),
        sa.Column("responsible_name", sa.String(length=180), server_default="", nullable=False),
        sa.Column("responsible_address", sa.String(length=500), server_default="", nullable=False),
        sa.Column("privacy_email", sa.String(length=180), nullable=True),
        sa.Column("arco_email", sa.String(length=180), nullable=True),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('DRAFT', 'PUBLISHED')", name="ck_company_privacy_notice_status"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["published_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "version", name="uq_company_privacy_notice_company_version"),
    )
    op.create_index("ix_company_privacy_notice_company_id", "company_privacy_notice", ["company_id"])
    op.create_index("ix_company_privacy_notice_status", "company_privacy_notice", ["status"])


def downgrade():
    op.drop_index("ix_company_privacy_notice_status", table_name="company_privacy_notice")
    op.drop_index("ix_company_privacy_notice_company_id", table_name="company_privacy_notice")
    op.drop_table("company_privacy_notice")
