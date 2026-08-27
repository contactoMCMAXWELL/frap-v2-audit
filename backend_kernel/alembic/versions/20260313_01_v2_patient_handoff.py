"""v2 patient identification + handoff

Revision ID: 20260313_01_v2_patient_handoff
Revises: 20260312_04_v2_frap_clinical
Create Date: 2026-03-13
"""

from alembic import op
import sqlalchemy as sa


revision = "20260313_01_v2_patient_handoff"
down_revision = "20260312_05_v2_trauma_refusal"
branch_labels = None
depends_on = None


def upgrade():

    # ampliar frap_clinical_record_v2
    op.add_column(
        "frap_clinical_record_v2",
        sa.Column("patient_birth_date", sa.Date(), nullable=True),
    )

    op.add_column(
        "frap_clinical_record_v2",
        sa.Column("patient_identifier", sa.String(100), nullable=True),
    )

    op.add_column(
        "frap_clinical_record_v2",
        sa.Column("patient_address", sa.String(255), nullable=True),
    )

    op.add_column(
        "frap_clinical_record_v2",
        sa.Column("responsible_name", sa.String(150), nullable=True),
    )

    op.add_column(
        "frap_clinical_record_v2",
        sa.Column("responsible_relationship", sa.String(100), nullable=True),
    )

    op.add_column(
        "frap_clinical_record_v2",
        sa.Column("responsible_phone", sa.String(50), nullable=True),
    )

    op.add_column(
        "frap_clinical_record_v2",
        sa.Column("pregnancy_status", sa.String(50), nullable=True),
    )

    op.add_column(
        "frap_clinical_record_v2",
        sa.Column("gestational_weeks", sa.Integer(), nullable=True),
    )

    # tabla handoff
    op.create_table(
        "frap_handoff_v2",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("intake_id", sa.UUID(), nullable=False),

        sa.Column("destination_hospital", sa.String(150)),
        sa.Column("receiving_person_name", sa.String(150)),
        sa.Column("receiving_person_role", sa.String(100)),

        sa.Column("handoff_summary", sa.Text()),
        sa.Column("patient_final_condition", sa.String(150)),
        sa.Column("handoff_result", sa.String(100)),
        sa.Column("continuity_notes", sa.Text()),

        sa.Column("handoff_at", sa.DateTime(timezone=True)),

        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )


def downgrade():
    op.drop_table("frap_handoff_v2")