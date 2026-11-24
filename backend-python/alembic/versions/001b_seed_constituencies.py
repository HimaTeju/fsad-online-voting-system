"""Seed Karnataka parliamentary constituencies

The demo voters (002) and pincodes (003) look constituencies up by name, so
they must exist first. This data used to come from the Spring Boot backend's
seed migration, which was never ported to Alembic.

Revision ID: 001b
Revises: 001
Create Date: 2026-11-24 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "001b"
down_revision = "001"
branch_labels = None
depends_on = None

# (constituency, district)
CONSTITUENCIES = [
    ("Chikkodi", "Belagavi"),
    ("Belagavi", "Belagavi"),
    ("Bagalkot", "Bagalkot"),
    ("Vijayapura", "Vijayapura"),
    ("Gulbarga", "Kalaburagi"),
    ("Bidar", "Bidar"),
    ("Raichur", "Raichur"),
    ("Koppal", "Koppal"),
    ("Ballari", "Ballari"),
    ("Haveri", "Haveri"),
    ("Dharwad", "Dharwad"),
    ("Uttara Kannada", "Uttara Kannada"),
    ("Davanagere", "Davanagere"),
    ("Shivamogga", "Shivamogga"),
    ("Udupi-Chikkamagaluru", "Udupi"),
    ("Hassan", "Hassan"),
    ("Dakshina Kannada", "Dakshina Kannada"),
    ("Chitradurga", "Chitradurga"),
    ("Tumakuru", "Tumakuru"),
    ("Mandya", "Mandya"),
    ("Mysuru", "Mysuru"),
    ("Chamarajanagar", "Chamarajanagar"),
    ("Bengaluru Rural", "Bengaluru Rural"),
    ("Bengaluru North", "Bengaluru Urban"),
    ("Bengaluru Central", "Bengaluru Urban"),
    ("Bengaluru South", "Bengaluru Urban"),
    ("Chikkaballapur", "Chikkaballapur"),
    ("Kolar", "Kolar"),
]


def upgrade() -> None:
    stmt = sa.text(
        "INSERT IGNORE INTO constituencies (name, state, district, seat_type, total_voters, region) "
        "VALUES (:name, 'Karnataka', :district, 'GENERAL', 0, 'South')"
    )
    for name, district in CONSTITUENCIES:
        op.get_bind().execute(stmt, {"name": name, "district": district})


def downgrade() -> None:
    op.get_bind().execute(
        sa.text("DELETE FROM constituencies WHERE name IN :names").bindparams(
            sa.bindparam("names", expanding=True)
        ),
        {"names": [n for n, _ in CONSTITUENCIES]},
    )
