"""service operation modes, standby hierarchy and structured locations

Revision ID: 20260828_01_service_operation_modes
Revises: 20260827_02_handoff_audit_timestamps
Create Date: 2026-08-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260828_01_service_operation_modes"
down_revision = "20260827_02_handoff_audit_timestamps"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "service_intake_v2",
        sa.Column(
            "operation_mode",
            sa.String(length=20),
            nullable=False,
            server_default="scene",
        ),
    )

    op.add_column(
        "service_intake_v2",
        sa.Column(
            "parent_intake_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )

    op.add_column(
        "service_intake_v2",
        sa.Column("standby_event_name", sa.String(length=180), nullable=True),
    )

    op.add_column(
        "service_intake_v2",
        sa.Column("standby_starts_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "service_intake_v2",
        sa.Column("standby_ends_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "service_intake_v2",
        sa.Column("standby_billing_mode", sa.String(length=20), nullable=True),
    )

    op.add_column(
        "service_intake_v2",
        sa.Column("coverage_status", sa.String(length=30), nullable=True),
    )

    op.add_column(
        "service_intake_v2",
        sa.Column("billing_scope", sa.String(length=30), nullable=True),
    )

    op.add_column(
        "service_intake_v2",
        sa.Column("coverage_evaluated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_foreign_key(
        "fk_service_intake_v2_parent_intake_id",
        "service_intake_v2",
        "service_intake_v2",
        ["parent_intake_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_index(
        op.f("ix_service_intake_v2_parent_intake_id"),
        "service_intake_v2",
        ["parent_intake_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_service_intake_v2_operation_mode"),
        "service_intake_v2",
        ["operation_mode"],
        unique=False,
    )

    op.create_table(
        "service_location_v2",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "intake_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "location_role",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "place_type",
            sa.String(length=40),
            nullable=True,
        ),
        sa.Column(
            "name",
            sa.String(length=180),
            nullable=False,
            server_default="",
        ),
        sa.Column(
            "address_text",
            sa.String(length=255),
            nullable=False,
            server_default="",
        ),
        sa.Column(
            "reference",
            sa.String(length=255),
            nullable=False,
            server_default="",
        ),
        sa.Column(
            "lat",
            sa.Float(),
            nullable=True,
        ),
        sa.Column(
            "lng",
            sa.Float(),
            nullable=True,
        ),
        sa.Column(
            "sequence",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
        sa.Column(
            "active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
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
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["intake_id"],
            ["service_intake_v2.id"],
            ondelete="CASCADE",
        ),
    )

    op.create_index(
        op.f("ix_service_location_v2_company_id"),
        "service_location_v2",
        ["company_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_service_location_v2_intake_id"),
        "service_location_v2",
        ["intake_id"],
        unique=False,
    )

    op.create_index(
        "ix_service_location_v2_intake_role",
        "service_location_v2",
        ["intake_id", "location_role"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_service_location_v2_intake_role",
        table_name="service_location_v2",
    )
    op.drop_index(
        op.f("ix_service_location_v2_intake_id"),
        table_name="service_location_v2",
    )
    op.drop_index(
        op.f("ix_service_location_v2_company_id"),
        table_name="service_location_v2",
    )
    op.drop_table("service_location_v2")

    op.drop_index(
        op.f("ix_service_intake_v2_operation_mode"),
        table_name="service_intake_v2",
    )
    op.drop_index(
        op.f("ix_service_intake_v2_parent_intake_id"),
        table_name="service_intake_v2",
    )

    op.drop_constraint(
        "fk_service_intake_v2_parent_intake_id",
        "service_intake_v2",
        type_="foreignkey",
    )

    op.drop_column("service_intake_v2", "coverage_evaluated_at")
    op.drop_column("service_intake_v2", "billing_scope")
    op.drop_column("service_intake_v2", "coverage_status")
    op.drop_column("service_intake_v2", "standby_billing_mode")
    op.drop_column("service_intake_v2", "standby_ends_at")
    op.drop_column("service_intake_v2", "standby_starts_at")
    op.drop_column("service_intake_v2", "standby_event_name")
    op.drop_column("service_intake_v2", "parent_intake_id")
    op.drop_column("service_intake_v2", "operation_mode")
