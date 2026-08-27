"""v2 supplies and financials

Revision ID: 20260312_03_v2_supplies_financials
Revises: 20260312_02_v2_dispatch_timeline
Create Date: 2026-03-12
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260312_03_v2_supplies_financials"
down_revision = "20260312_02_v2_dispatch_timeline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "company_supplies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("category", sa.String(length=60), nullable=False),
        sa.Column("unit_label", sa.String(length=30), nullable=False),
        sa.Column("sku", sa.String(length=60), nullable=False),
        sa.Column("default_unit_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_company_supplies_company_id"), "company_supplies", ["company_id"], unique=False)

    op.create_table(
        "service_supply_usage",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("supply_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Numeric(12, 2), nullable=False),
        sa.Column("unit_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("total_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("lot_number", sa.String(length=60), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["intake_id"], ["service_intake_v2.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["supply_id"], ["company_supplies.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_service_supply_usage_company_id"), "service_supply_usage", ["company_id"], unique=False)
    op.create_index(op.f("ix_service_supply_usage_intake_id"), "service_supply_usage", ["intake_id"], unique=False)
    op.create_index(op.f("ix_service_supply_usage_supply_id"), "service_supply_usage", ["supply_id"], unique=False)

    op.create_table(
        "service_financial_v2",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("intake_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("crew_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("unit_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("fuel_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("supplies_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("other_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("total_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("sale_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("margin_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("margin_percent", sa.Numeric(12, 2), nullable=False),
        sa.Column("payer_type", sa.String(length=40), nullable=False),
        sa.Column("billing_status", sa.String(length=40), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["intake_id"], ["service_intake_v2.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("intake_id"),
    )
    op.create_index(op.f("ix_service_financial_v2_company_id"), "service_financial_v2", ["company_id"], unique=False)
    op.create_index(op.f("ix_service_financial_v2_intake_id"), "service_financial_v2", ["intake_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_service_financial_v2_intake_id"), table_name="service_financial_v2")
    op.drop_index(op.f("ix_service_financial_v2_company_id"), table_name="service_financial_v2")
    op.drop_table("service_financial_v2")

    op.drop_index(op.f("ix_service_supply_usage_supply_id"), table_name="service_supply_usage")
    op.drop_index(op.f("ix_service_supply_usage_intake_id"), table_name="service_supply_usage")
    op.drop_index(op.f("ix_service_supply_usage_company_id"), table_name="service_supply_usage")
    op.drop_table("service_supply_usage")

    op.drop_index(op.f("ix_company_supplies_company_id"), table_name="company_supplies")
    op.drop_table("company_supplies")