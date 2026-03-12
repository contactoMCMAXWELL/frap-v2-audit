"""add fraps.hash_final only (locked_at already exists)

Revision ID: 0005_frap_lock_hash_fields
Revises: 0004_phase1_enterprise_fields
Create Date: 2026-02-18
"""

from alembic import op

revision = "0005_frap_lock_hash_fields"
down_revision = "0004_phase1_enterprise_fields"
branch_labels = None
depends_on = None


def upgrade():
    # locked_at ya existe en producción / tu DB actual, así que NO lo agregamos.
    # Agregamos solo hash_final y lo hacemos idempotente.
    op.execute("ALTER TABLE fraps ADD COLUMN IF NOT EXISTS hash_final VARCHAR(64)")


def downgrade():
    op.execute("ALTER TABLE fraps DROP COLUMN IF EXISTS hash_final")
