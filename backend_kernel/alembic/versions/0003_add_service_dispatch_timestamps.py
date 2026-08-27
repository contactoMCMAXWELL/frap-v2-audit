from alembic import op
import sqlalchemy as sa

revision = "0003_add_service_dispatch_timestamps"
down_revision = "0002_signatures"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("services", sa.Column("en_route_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("services", sa.Column("on_scene_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("services", sa.Column("transport_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("services", sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("services", sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column("services", "finished_at")
    op.drop_column("services", "delivered_at")
    op.drop_column("services", "transport_at")
    op.drop_column("services", "on_scene_at")
    op.drop_column("services", "en_route_at")
