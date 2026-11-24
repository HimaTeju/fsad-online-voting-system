"""Rename Field Officer to Booth Level Officer; add constituency_id to users

Revision ID: 005
Revises: 004
Create Date: 2026-11-24 00:00:00
"""
from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE users
        ADD COLUMN constituency_id BIGINT NULL,
        ADD CONSTRAINT fk_users_constituency FOREIGN KEY (constituency_id) REFERENCES constituencies(id)
    """)

    op.execute("""
        UPDATE users
        SET full_name = 'Booth Level Officer Bengaluru South',
            constituency_id = (SELECT id FROM constituencies WHERE name = 'Bengaluru South')
        WHERE email = 'officer@voting.gov.in'
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE users
        SET full_name = 'Field Officer Delhi', constituency_id = NULL
        WHERE email = 'officer@voting.gov.in'
    """)

    op.execute("""
        ALTER TABLE users
        DROP FOREIGN KEY fk_users_constituency,
        DROP COLUMN constituency_id
    """)
