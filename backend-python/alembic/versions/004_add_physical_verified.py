"""Add is_physical_verified to voter_id_applications

Revision ID: 004
Revises: 003
Create Date: 2024-01-04 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "voter_id_applications",
        sa.Column("is_physical_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("voter_id_applications", "is_physical_verified")
