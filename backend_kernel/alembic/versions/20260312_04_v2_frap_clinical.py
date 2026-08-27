"""v2 frap clinical

Revision ID: 20260312_04_v2_frap_clinical
Revises: 20260312_03_v2_supplies_financials
Create Date: 2026-03-12
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260312_04_v2_frap_clinical"
down_revision = "20260312_03_v2_supplies_financials"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "frap_clinical_record_v2",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_name", sa.String(length=150), nullable=False),
        sa.Column("patient_age", sa.String(length=30), nullable=False),
        sa.Column("patient_sex", sa.String(length=20), nullable=False),
        sa.Column("chief_complaint", sa.String(length=250), nullable=False),
        sa.Column("mechanism_of_injury", sa.String(length=250), nullable=False),
        sa.Column("clinical_impression", sa.String(length=250), nullable=False),
        sa.Column("consciousness_level", sa.String(length=50), nullable=False),
        sa.Column("airway_status", sa.String(length=50), nullable=False),
        sa.Column("breathing_status", sa.String(length=50), nullable=False),
        sa.Column("circulation_status", sa.String(length=50), nullable=False),
        sa.Column("glasgow_eye", sa.String(length=10), nullable=False),
        sa.Column("glasgow_verbal", sa.String(length=10), nullable=False),
        sa.Column("glasgow_motor", sa.String(length=10), nullable=False),
        sa.Column("glasgow_total", sa.String(length=10), nullable=False),
        sa.Column("allergies", sa.Text(), nullable=False),
        sa.Column("current_medications", sa.Text(), nullable=False),
        sa.Column("relevant_history", sa.Text(), nullable=False),
        sa.Column("narrative", sa.Text(), nullable=False),
        sa.Column("destination_outcome", sa.String(length=150), nullable=False),
        sa.Column("refusal_of_care", sa.Boolean(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["intake_id"], ["service_intake_v2.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("intake_id"),
    )
    op.create_index(op.f("ix_frap_clinical_record_v2_company_id"), "frap_clinical_record_v2", ["company_id"], unique=False)
    op.create_index(op.f("ix_frap_clinical_record_v2_intake_id"), "frap_clinical_record_v2", ["intake_id"], unique=False)

    op.create_table(
        "frap_vital_signs_v2",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("taken_at_label", sa.String(length=50), nullable=False),
        sa.Column("blood_pressure", sa.String(length=30), nullable=False),
        sa.Column("heart_rate", sa.String(length=20), nullable=False),
        sa.Column("respiratory_rate", sa.String(length=20), nullable=False),
        sa.Column("spo2", sa.String(length=20), nullable=False),
        sa.Column("temperature", sa.String(length=20), nullable=False),
        sa.Column("glucose", sa.String(length=20), nullable=False),
        sa.Column("pain_scale", sa.String(length=20), nullable=False),
        sa.Column("pupils", sa.String(length=50), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["intake_id"], ["service_intake_v2.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_frap_vital_signs_v2_company_id"), "frap_vital_signs_v2", ["company_id"], unique=False)
    op.create_index(op.f("ix_frap_vital_signs_v2_intake_id"), "frap_vital_signs_v2", ["intake_id"], unique=False)

    op.create_table(
        "frap_procedures_v2",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("procedure_name", sa.String(length=150), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("body_site", sa.String(length=100), nullable=False),
        sa.Column("successful", sa.Boolean(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["intake_id"], ["service_intake_v2.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_frap_procedures_v2_company_id"), "frap_procedures_v2", ["company_id"], unique=False)
    op.create_index(op.f("ix_frap_procedures_v2_intake_id"), "frap_procedures_v2", ["intake_id"], unique=False)

    op.create_table(
        "frap_medications_v2",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("medication_name", sa.String(length=150), nullable=False),
        sa.Column("dose", sa.String(length=60), nullable=False),
        sa.Column("route", sa.String(length=60), nullable=False),
        sa.Column("response", sa.String(length=150), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["intake_id"], ["service_intake_v2.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_frap_medications_v2_company_id"), "frap_medications_v2", ["company_id"], unique=False)
    op.create_index(op.f("ix_frap_medications_v2_intake_id"), "frap_medications_v2", ["intake_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_frap_medications_v2_intake_id"), table_name="frap_medications_v2")
    op.drop_index(op.f("ix_frap_medications_v2_company_id"), table_name="frap_medications_v2")
    op.drop_table("frap_medications_v2")

    op.drop_index(op.f("ix_frap_procedures_v2_intake_id"), table_name="frap_procedures_v2")
    op.drop_index(op.f("ix_frap_procedures_v2_company_id"), table_name="frap_procedures_v2")
    op.drop_table("frap_procedures_v2")

    op.drop_index(op.f("ix_frap_vital_signs_v2_intake_id"), table_name="frap_vital_signs_v2")
    op.drop_index(op.f("ix_frap_vital_signs_v2_company_id"), table_name="frap_vital_signs_v2")
    op.drop_table("frap_vital_signs_v2")

    op.drop_index(op.f("ix_frap_clinical_record_v2_intake_id"), table_name="frap_clinical_record_v2")
    op.drop_index(op.f("ix_frap_clinical_record_v2_company_id"), table_name="frap_clinical_record_v2")
    op.drop_table("frap_clinical_record_v2")