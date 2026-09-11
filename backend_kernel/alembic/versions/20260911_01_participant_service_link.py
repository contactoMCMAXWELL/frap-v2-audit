"""vinculo entre participantes y servicios del evento

Revision ID: 20260911_01_participant_service_link
Revises: 20260910_02_company_privacy_notice
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260911_01_participant_service_link"
down_revision = "20260910_02_company_privacy_notice"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "event_participant_service_link",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("participant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["participant_id"],
            ["event_participant.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["intake_id"],
            ["service_intake_v2.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "intake_id",
            name="uq_event_participant_service_link_intake",
        ),
    )

    op.create_index(
        "ix_event_participant_service_link_company_id",
        "event_participant_service_link",
        ["company_id"],
    )
    op.create_index(
        "ix_event_participant_service_link_participant_id",
        "event_participant_service_link",
        ["participant_id"],
    )
    op.create_index(
        "ix_event_participant_service_link_intake_id",
        "event_participant_service_link",
        ["intake_id"],
    )
    op.create_index(
        "ix_event_participant_service_link_created_by_user_id",
        "event_participant_service_link",
        ["created_by_user_id"],
    )


def downgrade():
    op.drop_index(
        "ix_event_participant_service_link_created_by_user_id",
        table_name="event_participant_service_link",
    )
    op.drop_index(
        "ix_event_participant_service_link_intake_id",
        table_name="event_participant_service_link",
    )
    op.drop_index(
        "ix_event_participant_service_link_participant_id",
        table_name="event_participant_service_link",
    )
    op.drop_index(
        "ix_event_participant_service_link_company_id",
        table_name="event_participant_service_link",
    )
    op.drop_table("event_participant_service_link")
