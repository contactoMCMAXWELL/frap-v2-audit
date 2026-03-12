from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_signatures"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "signatures",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("frap_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("fraps.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(length=30), nullable=False),
        sa.Column("image_base64", sa.Text(), nullable=False),
        sa.Column("signer_name", sa.String(length=120), nullable=True),
        sa.Column("device_id", sa.String(length=120), nullable=True),
        sa.Column("geo_lat", sa.Float(), nullable=True),
        sa.Column("geo_lng", sa.Float(), nullable=True),
        sa.Column("geo_accuracy_m", sa.Float(), nullable=True),
        sa.Column("signed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("frap_id", "role", name="uq_signature_frap_role"),
    )
    op.create_index("ix_signatures_company_frap", "signatures", ["company_id", "frap_id"], unique=False)

def downgrade():
    op.drop_index("ix_signatures_company_frap", table_name="signatures")
    op.drop_table("signatures")
