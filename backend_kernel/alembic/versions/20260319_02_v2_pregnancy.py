"""create frap_pregnancy_v2

Revision ID: 20260319_02_v2_pregnancy
Revises: 20260319_01_v2_cardio
Create Date: 2026-03-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260319_02_v2_pregnancy"
down_revision = "20260319_01_v2_cardio"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "frap_pregnancy_v2",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),

        sa.Column("pregnancy_confirmed", sa.Boolean(), nullable=True),
        sa.Column("gestational_weeks", sa.String(length=20), nullable=True),
        sa.Column("gravida", sa.String(length=20), nullable=True),
        sa.Column("para", sa.String(length=20), nullable=True),
        sa.Column("abortions", sa.String(length=20), nullable=True),
        sa.Column("c_sections", sa.String(length=20), nullable=True),
        sa.Column("last_menstrual_period", sa.String(length=80), nullable=True),
        sa.Column("prenatal_control", sa.Boolean(), nullable=True),
        sa.Column("high_risk_pregnancy", sa.Boolean(), nullable=True),
        sa.Column("multiple_pregnancy", sa.Boolean(), nullable=True),

        sa.Column("abdominal_pain", sa.Boolean(), nullable=True),
        sa.Column("vaginal_bleeding", sa.Boolean(), nullable=True),
        sa.Column("fluid_leak", sa.Boolean(), nullable=True),
        sa.Column("fetal_movements_present", sa.Boolean(), nullable=True),
        sa.Column("contractions_present", sa.Boolean(), nullable=True),
        sa.Column("contraction_frequency", sa.String(length=80), nullable=True),
        sa.Column("contraction_duration", sa.String(length=80), nullable=True),
        sa.Column("fetal_presentation", sa.String(length=80), nullable=True),
        sa.Column("crowning", sa.Boolean(), nullable=True),
        sa.Column("urge_to_push", sa.Boolean(), nullable=True),
        sa.Column("uterine_height", sa.String(length=80), nullable=True),
        sa.Column("uterine_tone", sa.String(length=80), nullable=True),
        sa.Column("fetal_heart_rate", sa.String(length=40), nullable=True),
        sa.Column("suspected_preeclampsia", sa.Boolean(), nullable=True),
        sa.Column("suspected_eclampsia", sa.Boolean(), nullable=True),
        sa.Column("pregnancy_trauma", sa.Boolean(), nullable=True),

        sa.Column("active_labor", sa.Boolean(), nullable=True),
        sa.Column("delivery_performed", sa.Boolean(), nullable=True),
        sa.Column("birth_time", sa.String(length=80), nullable=True),
        sa.Column("newborn_sex", sa.String(length=20), nullable=True),
        sa.Column("apgar_1_min", sa.String(length=10), nullable=True),
        sa.Column("apgar_5_min", sa.String(length=10), nullable=True),
        sa.Column("placenta_delivered", sa.Boolean(), nullable=True),
        sa.Column("placenta_complete", sa.Boolean(), nullable=True),
        sa.Column("maternal_complications", sa.Text(), nullable=True),
        sa.Column("neonatal_complications", sa.Text(), nullable=True),
        sa.Column("neonatal_resuscitation", sa.Boolean(), nullable=True),

        sa.Column("oxygen_administered", sa.Boolean(), nullable=True),
        sa.Column("iv_access", sa.Boolean(), nullable=True),
        sa.Column("hemorrhage_control", sa.Boolean(), nullable=True),
        sa.Column("cord_clamping", sa.Boolean(), nullable=True),
        sa.Column("skin_to_skin_contact", sa.Boolean(), nullable=True),
        sa.Column("newborn_thermal_care", sa.Boolean(), nullable=True),
        sa.Column("mother_destination", sa.String(length=120), nullable=True),
        sa.Column("newborn_destination", sa.String(length=120), nullable=True),

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
        sa.UniqueConstraint("intake_id", name="uq_frap_pregnancy_v2_intake_id"),
    )

    op.create_index("ix_frap_pregnancy_v2_company_id", "frap_pregnancy_v2", ["company_id"], unique=False)
    op.create_index("ix_frap_pregnancy_v2_intake_id", "frap_pregnancy_v2", ["intake_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_frap_pregnancy_v2_intake_id", table_name="frap_pregnancy_v2")
    op.drop_index("ix_frap_pregnancy_v2_company_id", table_name="frap_pregnancy_v2")
    op.drop_table("frap_pregnancy_v2")