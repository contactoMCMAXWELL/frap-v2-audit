"""v2 admin core

Revision ID: 20260313_02_v2_admin_core
Revises: 20260313_01_v2_patient_handoff
Create Date: 2026-03-13
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260313_02_v2_admin_core"
down_revision = "20260313_01_v2_patient_handoff"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_roles_name"), "roles", ["name"], unique=True)

    op.create_table(
        "hospital_catalog",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("level", sa.String(length=50), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=False),
        sa.Column("trauma_center", sa.Boolean(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_hospital_catalog_company_id"), "hospital_catalog", ["company_id"], unique=False)

    op.create_table(
        "medication_catalog",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("presentation", sa.String(length=120), nullable=False),
        sa.Column("concentration", sa.String(length=120), nullable=False),
        sa.Column("route", sa.String(length=80), nullable=False),
        sa.Column("default_dose", sa.String(length=80), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_medication_catalog_company_id"), "medication_catalog", ["company_id"], unique=False)

    op.create_table(
        "procedure_catalog",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_procedure_catalog_company_id"), "procedure_catalog", ["company_id"], unique=False)

    op.create_table(
        "unit_staff",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("unit_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assignment_role", sa.String(length=80), nullable=False),
        sa.Column("shift_label", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_unit_staff_company_id"), "unit_staff", ["company_id"], unique=False)
    op.create_index(op.f("ix_unit_staff_unit_id"), "unit_staff", ["unit_id"], unique=False)
    op.create_index(op.f("ix_unit_staff_user_id"), "unit_staff", ["user_id"], unique=False)

    op.add_column("companies", sa.Column("legal_name", sa.String(length=150), nullable=False, server_default=""))
    op.add_column("companies", sa.Column("city", sa.String(length=100), nullable=False, server_default=""))
    op.add_column("companies", sa.Column("state", sa.String(length=100), nullable=False, server_default=""))
    op.add_column("companies", sa.Column("country", sa.String(length=100), nullable=False, server_default="Mexico"))
    op.add_column("companies", sa.Column("email", sa.String(length=120), nullable=False, server_default=""))
    op.add_column("companies", sa.Column("website", sa.String(length=150), nullable=False, server_default=""))
    op.add_column("companies", sa.Column("medical_director", sa.String(length=150), nullable=False, server_default=""))
    op.add_column("companies", sa.Column("license_number", sa.String(length=100), nullable=False, server_default=""))

    op.add_column("users", sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("users", sa.Column("professional_license", sa.String(length=100), nullable=False, server_default=""))
    op.create_index(op.f("ix_users_role_id"), "users", ["role_id"], unique=False)
    op.create_foreign_key("fk_users_role_id_roles", "users", "roles", ["role_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("fk_users_role_id_roles", "users", type_="foreignkey")
    op.drop_index(op.f("ix_users_role_id"), table_name="users")
    op.drop_column("users", "professional_license")
    op.drop_column("users", "role_id")

    op.drop_column("companies", "license_number")
    op.drop_column("companies", "medical_director")
    op.drop_column("companies", "website")
    op.drop_column("companies", "email")
    op.drop_column("companies", "country")
    op.drop_column("companies", "state")
    op.drop_column("companies", "city")
    op.drop_column("companies", "legal_name")

    op.drop_index(op.f("ix_unit_staff_user_id"), table_name="unit_staff")
    op.drop_index(op.f("ix_unit_staff_unit_id"), table_name="unit_staff")
    op.drop_index(op.f("ix_unit_staff_company_id"), table_name="unit_staff")
    op.drop_table("unit_staff")

    op.drop_index(op.f("ix_procedure_catalog_company_id"), table_name="procedure_catalog")
    op.drop_table("procedure_catalog")

    op.drop_index(op.f("ix_medication_catalog_company_id"), table_name="medication_catalog")
    op.drop_table("medication_catalog")

    op.drop_index(op.f("ix_hospital_catalog_company_id"), table_name="hospital_catalog")
    op.drop_table("hospital_catalog")

    op.drop_index(op.f("ix_roles_name"), table_name="roles")
    op.drop_table("roles")