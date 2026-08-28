from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260827_01_frap_retrospective"
down_revision = "20260319_04_v2_signatures"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -------------------------------------------------------------------------
    # service_intake_v2
    # -------------------------------------------------------------------------
    op.add_column(
        "service_intake_v2",
        sa.Column(
            "capture_mode",
            sa.String(length=20),
            nullable=False,
            server_default="realtime",
        ),
    )
    op.add_column(
        "service_intake_v2",
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "service_intake_v2",
        sa.Column("retrospective_reason", sa.Text(), nullable=True),
    )
    op.add_column(
        "service_intake_v2",
        sa.Column(
            "retrospective_started_by_user_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.add_column(
        "service_intake_v2",
        sa.Column(
            "retrospective_started_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "service_intake_v2",
        sa.Column(
            "approved_by_user_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.add_column(
        "service_intake_v2",
        sa.Column(
            "approved_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_service_intake_v2_retrospective_started_by_user_id_users",
        "service_intake_v2",
        "users",
        ["retrospective_started_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_service_intake_v2_approved_by_user_id_users",
        "service_intake_v2",
        "users",
        ["approved_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_index(
        "ix_service_intake_v2_retrospective_started_by_user_id",
        "service_intake_v2",
        ["retrospective_started_by_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_service_intake_v2_approved_by_user_id",
        "service_intake_v2",
        ["approved_by_user_id"],
        unique=False,
    )

    # -------------------------------------------------------------------------
    # Eventos operativos / clínicos
    # -------------------------------------------------------------------------
    op.add_column(
        "service_dispatch_events_v2",
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "frap_assessment_v2",
        sa.Column("assessed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "frap_vital_signs_v2",
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "frap_procedures_v2",
        sa.Column("performed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "frap_medications_v2",
        sa.Column("administered_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "frap_trauma_v2",
        sa.Column("assessed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "frap_body_map_v2",
        sa.Column("assessed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "frap_pediatrics_v2",
        sa.Column("assessed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "frap_cardio_v2",
        sa.Column("assessed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "frap_pregnancy_v2",
        sa.Column("assessed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "frap_refusal_v2",
        sa.Column("refused_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("frap_refusal_v2", "refused_at")
    op.drop_column("frap_pregnancy_v2", "assessed_at")
    op.drop_column("frap_cardio_v2", "assessed_at")
    op.drop_column("frap_pediatrics_v2", "assessed_at")
    op.drop_column("frap_body_map_v2", "assessed_at")
    op.drop_column("frap_trauma_v2", "assessed_at")
    op.drop_column("frap_medications_v2", "administered_at")
    op.drop_column("frap_procedures_v2", "performed_at")
    op.drop_column("frap_vital_signs_v2", "taken_at")
    op.drop_column("frap_assessment_v2", "assessed_at")
    op.drop_column("service_dispatch_events_v2", "occurred_at")

    op.drop_index(
        "ix_service_intake_v2_approved_by_user_id",
        table_name="service_intake_v2",
    )
    op.drop_index(
        "ix_service_intake_v2_retrospective_started_by_user_id",
        table_name="service_intake_v2",
    )

    op.drop_constraint(
        "fk_service_intake_v2_approved_by_user_id_users",
        "service_intake_v2",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_service_intake_v2_retrospective_started_by_user_id_users",
        "service_intake_v2",
        type_="foreignkey",
    )

    op.drop_column("service_intake_v2", "approved_at")
    op.drop_column("service_intake_v2", "approved_by_user_id")
    op.drop_column("service_intake_v2", "retrospective_started_at")
    op.drop_column("service_intake_v2", "retrospective_started_by_user_id")
    op.drop_column("service_intake_v2", "retrospective_reason")
    op.drop_column("service_intake_v2", "occurred_at")
    op.drop_column("service_intake_v2", "capture_mode")
