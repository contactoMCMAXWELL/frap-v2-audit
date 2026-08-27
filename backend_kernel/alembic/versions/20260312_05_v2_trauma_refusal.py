"""v2 trauma and refusal

Revision ID: 20260312_05_v2_trauma_refusal
Revises: 20260312_04_v2_frap_clinical
Create Date: 2026-03-12
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260312_05_v2_trauma_refusal"
down_revision = "20260312_04_v2_frap_clinical"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "frap_trauma_v2",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("trauma_type", sa.String(length=80), nullable=False),
        sa.Column("mechanism", sa.String(length=150), nullable=False),
        sa.Column("kinematics", sa.String(length=150), nullable=False),
        sa.Column("safety_equipment", sa.String(length=120), nullable=False),
        sa.Column("injured_regions", sa.Text(), nullable=False),
        sa.Column("deformity", sa.Text(), nullable=False),
        sa.Column("wounds", sa.Text(), nullable=False),
        sa.Column("bleeding", sa.Text(), nullable=False),
        sa.Column("burns", sa.Text(), nullable=False),
        sa.Column("immobilization", sa.Text(), nullable=False),
        sa.Column("trauma_priority", sa.String(length=50), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["intake_id"], ["service_intake_v2.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("intake_id"),
    )
    op.create_index(op.f("ix_frap_trauma_v2_company_id"), "frap_trauma_v2", ["company_id"], unique=False)
    op.create_index(op.f("ix_frap_trauma_v2_intake_id"), "frap_trauma_v2", ["intake_id"], unique=False)

    op.create_table(
        "frap_refusal_v2",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("refusal_type", sa.String(length=80), nullable=False),
        sa.Column("refusal_reason", sa.Text(), nullable=False),
        sa.Column("risks_explained", sa.Text(), nullable=False),
        sa.Column("decision_capacity", sa.String(length=80), nullable=False),
        sa.Column("patient_condition_at_refusal", sa.Text(), nullable=False),
        sa.Column("witness_name", sa.String(length=150), nullable=False),
        sa.Column("witness_relation", sa.String(length=100), nullable=False),
        sa.Column("witness_phone", sa.String(length=50), nullable=False),
        sa.Column("accepted_recommendations", sa.Text(), nullable=False),
        sa.Column("advised_return_precautions", sa.Text(), nullable=False),
        sa.Column("signature_pending", sa.Boolean(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["intake_id"], ["service_intake_v2.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("intake_id"),
    )
    op.create_index(op.f("ix_frap_refusal_v2_company_id"), "frap_refusal_v2", ["company_id"], unique=False)
    op.create_index(op.f("ix_frap_refusal_v2_intake_id"), "frap_refusal_v2", ["intake_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_frap_refusal_v2_intake_id"), table_name="frap_refusal_v2")
    op.drop_index(op.f("ix_frap_refusal_v2_company_id"), table_name="frap_refusal_v2")
    op.drop_table("frap_refusal_v2")

    op.drop_index(op.f("ix_frap_trauma_v2_intake_id"), table_name="frap_trauma_v2")
    op.drop_index(op.f("ix_frap_trauma_v2_company_id"), table_name="frap_trauma_v2")
    op.drop_table("frap_trauma_v2")