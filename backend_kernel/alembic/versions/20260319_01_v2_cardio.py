"""create frap_cardio_v2

Revision ID: 20260319_01_v2_cardio
Revises: 20260318_03_v2_pediatrics
Create Date: 2026-03-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260319_01_v2_cardio"
down_revision = "20260318_03_v2_pediatrics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "frap_cardio_v2",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),

        sa.Column("chief_complaint", sa.String(length=80), nullable=True),
        sa.Column("chest_pain_type", sa.String(length=80), nullable=True),
        sa.Column("pain_severity", sa.String(length=20), nullable=True),
        sa.Column("symptom_onset", sa.String(length=80), nullable=True),
        sa.Column("pain_radiation", sa.Text(), nullable=True),
        sa.Column("dyspnea", sa.Boolean(), nullable=True),
        sa.Column("diaphoresis", sa.Boolean(), nullable=True),
        sa.Column("nausea_vomiting", sa.Boolean(), nullable=True),
        sa.Column("syncope", sa.Boolean(), nullable=True),
        sa.Column("edema", sa.Boolean(), nullable=True),
        sa.Column("palpitations", sa.Boolean(), nullable=True),

        sa.Column("detected_rhythm", sa.String(length=80), nullable=True),
        sa.Column("interpreted_heart_rate", sa.String(length=80), nullable=True),
        sa.Column("low_output_signs", sa.Text(), nullable=True),
        sa.Column("suspected_acute_coronary_syndrome", sa.Boolean(), nullable=True),
        sa.Column("suspected_stemi", sa.Boolean(), nullable=True),
        sa.Column("cardiac_arrest", sa.Boolean(), nullable=True),
        sa.Column("rosc", sa.Boolean(), nullable=True),
        sa.Column("killip_class", sa.String(length=40), nullable=True),
        sa.Column("ecg_performed", sa.Boolean(), nullable=True),
        sa.Column("ecg_findings", sa.Text(), nullable=True),
        sa.Column("interpreted_blood_pressure", sa.String(length=80), nullable=True),
        sa.Column("peripheral_perfusion", sa.String(length=80), nullable=True),

        sa.Column("oxygen_administered", sa.Boolean(), nullable=True),
        sa.Column("aspirin_administered", sa.Boolean(), nullable=True),
        sa.Column("nitroglycerin_administered", sa.Boolean(), nullable=True),
        sa.Column("iv_io_access", sa.Boolean(), nullable=True),
        sa.Column("monitor_defibrillator", sa.Boolean(), nullable=True),
        sa.Column("defibrillation_performed", sa.Boolean(), nullable=True),
        sa.Column("cardioversion_performed", sa.Boolean(), nullable=True),
        sa.Column("transcutaneous_pacing", sa.Boolean(), nullable=True),
        sa.Column("cpr_performed", sa.Boolean(), nullable=True),

        sa.Column("notes", sa.Text(), nullable=True),
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

        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["intake_id"], ["service_intake_v2.id"], ondelete="CASCADE"),

        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("intake_id", name="uq_frap_cardio_v2_intake_id"),
    )

    op.create_index("ix_frap_cardio_v2_company_id", "frap_cardio_v2", ["company_id"], unique=False)
    op.create_index("ix_frap_cardio_v2_intake_id", "frap_cardio_v2", ["intake_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_frap_cardio_v2_intake_id", table_name="frap_cardio_v2")
    op.drop_index("ix_frap_cardio_v2_company_id", table_name="frap_cardio_v2")
    op.drop_table("frap_cardio_v2")