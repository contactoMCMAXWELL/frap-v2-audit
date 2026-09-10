"""proteccion de participantes para guardias y eventos

Revision ID: 20260909_01_event_participant_protection
Revises: 20260829_01_location_source
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260909_01_event_participant_protection"
down_revision = "20260829_01_location_source"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "event_participant_protection",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("registration_open", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("public_token", sa.String(80), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("public_event_name", sa.String(180), nullable=False),
        sa.Column("organizer_name", sa.String(180), nullable=False),
        sa.Column("registration_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("organizer_logo_url", sa.String(500), nullable=True),
        sa.Column("cover_image_url", sa.String(500), nullable=True),
        sa.Column("organizer_message", sa.String(250), nullable=True),
        sa.Column("gallery_json", postgresql.JSONB(), nullable=False),
        sa.Column("privacy_notice_version", sa.String(40), nullable=False),
        sa.Column("extra_json", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["intake_id"], ["service_intake_v2.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "intake_id", name="uq_event_participant_protection_company_intake"),
        sa.UniqueConstraint("public_token", name="uq_event_participant_protection_public_token"),
    )
    op.create_index("ix_event_participant_protection_company_id", "event_participant_protection", ["company_id"])
    op.create_index("ix_event_participant_protection_intake_id", "event_participant_protection", ["intake_id"])
    op.create_index("ix_event_participant_protection_public_token", "event_participant_protection", ["public_token"])

    op.create_table(
        "event_participant",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("protection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("participant_token", sa.String(80), nullable=False),
        sa.Column("status", sa.String(20), server_default="INICIADO", nullable=False),
        sa.Column("source", sa.String(20), server_default="public", nullable=False),
        sa.Column("participant_number", sa.String(50), nullable=True),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("paternal_surname", sa.String(100), nullable=False),
        sa.Column("maternal_surname", sa.String(100), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("phone", sa.String(40), nullable=True),
        sa.Column("email", sa.String(180), nullable=True),
        sa.Column("state_origin", sa.String(100), nullable=True),
        sa.Column("city_origin", sa.String(120), nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("team_name", sa.String(120), nullable=True),
        sa.Column("vehicle_type", sa.String(60), nullable=True),
        sa.Column("vehicle_number", sa.String(50), nullable=True),
        sa.Column("vehicle_make_model", sa.String(150), nullable=True),
        sa.Column("vehicle_color", sa.String(60), nullable=True),
        sa.Column("preloaded", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("profile_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_participant_update_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["protection_id"], ["event_participant_protection.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("protection_id", "participant_token", name="uq_event_participant_token"),
    )
    for col in ("company_id", "protection_id", "participant_token", "status", "participant_number"):
        op.create_index(f"ix_event_participant_{col}", "event_participant", [col])

    op.create_table(
        "event_participant_emergency_contact",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("participant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_order", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(180), nullable=False),
        sa.Column("relationship", sa.String(80), nullable=False),
        sa.Column("phone", sa.String(40), nullable=False),
        sa.Column("present_at_event", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["participant_id"], ["event_participant.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_event_participant_emergency_contact_company_id", "event_participant_emergency_contact", ["company_id"])
    op.create_index("ix_event_participant_emergency_contact_participant_id", "event_participant_emergency_contact", ["participant_id"])

    op.create_table(
        "event_participant_medical_profile",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("participant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("blood_type", sa.String(10), nullable=True),
        sa.Column("allergies_json", postgresql.JSONB(), nullable=False),
        sa.Column("allergies_detail", sa.Text(), nullable=True),
        sa.Column("conditions_json", postgresql.JSONB(), nullable=False),
        sa.Column("conditions_detail", sa.Text(), nullable=True),
        sa.Column("medications_json", postgresql.JSONB(), nullable=False),
        sa.Column("surgeries_json", postgresql.JSONB(), nullable=False),
        sa.Column("recent_injury_detail", sa.Text(), nullable=True),
        sa.Column("implants_json", postgresql.JSONB(), nullable=False),
        sa.Column("medical_service_type", sa.String(60), nullable=True),
        sa.Column("insurer_name", sa.String(180), nullable=True),
        sa.Column("policy_number", sa.String(100), nullable=True),
        sa.Column("affiliation_number", sa.String(100), nullable=True),
        sa.Column("transfer_preference", sa.String(80), nullable=True),
        sa.Column("preferred_hospital", sa.String(180), nullable=True),
        sa.Column("emergency_notes", sa.String(300), nullable=True),
        sa.Column("suit_cut_authorized", sa.Boolean(), nullable=True),
        sa.Column("protective_equipment_json", postgresql.JSONB(), nullable=False),
        sa.Column("declared_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["participant_id"], ["event_participant.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("participant_id", name="uq_event_participant_medical_profile_participant"),
    )
    op.create_index("ix_event_participant_medical_profile_company_id", "event_participant_medical_profile", ["company_id"])
    op.create_index("ix_event_participant_medical_profile_participant_id", "event_participant_medical_profile", ["participant_id"])

    op.create_table(
        "event_participant_consent",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("participant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("privacy_notice_version", sa.String(40), nullable=False),
        sa.Column("privacy_notice_accepted", sa.Boolean(), nullable=False),
        sa.Column("sensitive_data_authorized", sa.Boolean(), nullable=False),
        sa.Column("information_confirmed", sa.Boolean(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("audit_json", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["participant_id"], ["event_participant.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_event_participant_consent_company_id", "event_participant_consent", ["company_id"])
    op.create_index("ix_event_participant_consent_participant_id", "event_participant_consent", ["participant_id"])


def downgrade():
    op.drop_table("event_participant_consent")
    op.drop_table("event_participant_medical_profile")
    op.drop_table("event_participant_emergency_contact")
    op.drop_table("event_participant")
    op.drop_table("event_participant_protection")
