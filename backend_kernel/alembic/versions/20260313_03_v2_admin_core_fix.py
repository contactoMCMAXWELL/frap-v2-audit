"""v2 admin core fix

Revision ID: 20260313_03_v2_admin_core_fix
Revises: 20260313_02_v2_admin_core
Create Date: 2026-03-13
"""

from alembic import op


revision = "20260313_03_v2_admin_core_fix"
down_revision = "20260313_02_v2_admin_core"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = None

    try:
        from sqlalchemy import inspect
        inspector = inspect(bind)
    except Exception:
        inspector = None

    table_names = set(inspector.get_table_names()) if inspector else set()

    if "users" in table_names:
        fks = {fk["name"] for fk in inspector.get_foreign_keys("users") if fk.get("name")} if inspector else set()
        indexes = {ix["name"] for ix in inspector.get_indexes("users")} if inspector else set()
        cols = {c["name"] for c in inspector.get_columns("users")} if inspector else set()

        if "fk_users_role_id_roles" in fks:
            op.drop_constraint("fk_users_role_id_roles", "users", type_="foreignkey")

        if "ix_users_role_id" in indexes:
            op.drop_index("ix_users_role_id", table_name="users")

        if "role_id" in cols:
            op.drop_column("users", "role_id")

        if "professional_license" in cols:
            op.drop_column("users", "professional_license")

    table_names = set(inspector.get_table_names()) if inspector else set()
    if "roles" in table_names:
        indexes = {ix["name"] for ix in inspector.get_indexes("roles")} if inspector else set()
        if "ix_roles_name" in indexes:
            op.drop_index("ix_roles_name", table_name="roles")
        op.drop_table("roles")


def downgrade() -> None:
    pass