"""v2 dispatch timeline

Revision ID: 20260312_02_v2_dispatch_timeline
Revises: 20260312_01_v2_core
Create Date: 2026-03-12
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260312_02_v2_dispatch_timeline"
down_revision = "20260312_01_v2_core"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "service_dispatch_events_v2",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("service_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("unit_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("status_label", sa.String(length=80), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("event_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["intake_id"], ["service_intake_v2.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="SET NULL"),
    )
    op.create_index(op.f("ix_service_dispatch_events_v2_company_id"), "service_dispatch_events_v2", ["company_id"], unique=False)
    op.create_index(op.f("ix_service_dispatch_events_v2_intake_id"), "service_dispatch_events_v2", ["intake_id"], unique=False)
    op.create_index(op.f("ix_service_dispatch_events_v2_service_id"), "service_dispatch_events_v2", ["service_id"], unique=False)
    op.create_index(op.f("ix_service_dispatch_events_v2_unit_id"), "service_dispatch_events_v2", ["unit_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_service_dispatch_events_v2_unit_id"), table_name="service_dispatch_events_v2")
    op.drop_index(op.f("ix_service_dispatch_events_v2_service_id"), table_name="service_dispatch_events_v2")
    op.drop_index(op.f("ix_service_dispatch_events_v2_intake_id"), table_name="service_dispatch_events_v2")
    op.drop_index(op.f("ix_service_dispatch_events_v2_company_id"), table_name="service_dispatch_events_v2")
    op.drop_table("service_dispatch_events_v2")