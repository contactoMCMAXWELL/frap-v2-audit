"""Agrega token QR seguro para participantes de eventos.

Revision ID: 20260911_02_participant_qr_token
Revises: 20260911_01_participant_service_link
"""

from __future__ import annotations

import secrets

from alembic import op
import sqlalchemy as sa


revision = "20260911_02_participant_qr_token"
down_revision = "20260911_01_participant_service_link"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "event_participant",
        sa.Column("qr_token", sa.String(length=80), nullable=True),
    )

    connection = op.get_bind()

    participant_ids = connection.execute(
        sa.text(
            """
            SELECT id
            FROM event_participant
            WHERE qr_token IS NULL
            """
        )
    ).scalars().all()

    for participant_id in participant_ids:
        while True:
            qr_token = secrets.token_urlsafe(32)

            exists = connection.execute(
                sa.text(
                    """
                    SELECT 1
                    FROM event_participant
                    WHERE qr_token = :qr_token
                    LIMIT 1
                    """
                ),
                {"qr_token": qr_token},
            ).first()

            if exists is None:
                break

        connection.execute(
            sa.text(
                """
                UPDATE event_participant
                SET qr_token = :qr_token
                WHERE id = :participant_id
                """
            ),
            {
                "qr_token": qr_token,
                "participant_id": participant_id,
            },
        )

    op.alter_column(
        "event_participant",
        "qr_token",
        existing_type=sa.String(length=80),
        nullable=False,
    )

    op.create_index(
        "ix_event_participant_qr_token",
        "event_participant",
        ["qr_token"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_event_participant_qr_token",
        table_name="event_participant",
    )

    op.drop_column(
        "event_participant",
        "qr_token",
    )