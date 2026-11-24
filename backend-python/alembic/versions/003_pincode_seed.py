"""Seed Karnataka constituency pincodes

Revision ID: 003
Revises: 002
Create Date: 2024-01-03 00:00:00
"""
from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None

# Representative pincodes for each Karnataka parliamentary constituency.
# Each entry: (pincode, constituency_name_as_in_db)
PINCODES = [
    # Chikkodi
    ("591201", "Chikkodi"), ("591224", "Chikkodi"), ("591302", "Chikkodi"),
    # Belagavi
    ("590001", "Belagavi"), ("590010", "Belagavi"), ("591108", "Belagavi"),
    # Bagalkot
    ("587101", "Bagalkot"), ("587201", "Bagalkot"), ("587311", "Bagalkot"),
    # Vijayapura
    ("586101", "Vijayapura"), ("586201", "Vijayapura"), ("586112", "Vijayapura"),
    # Gulbarga
    ("585101", "Gulbarga"), ("585102", "Gulbarga"), ("585201", "Gulbarga"),
    # Bidar
    ("585401", "Bidar"), ("585403", "Bidar"), ("585421", "Bidar"),
    # Raichur
    ("584101", "Raichur"), ("584102", "Raichur"), ("584128", "Raichur"),
    # Koppal
    ("583231", "Koppal"), ("583232", "Koppal"), ("583201", "Koppal"),
    # Ballari
    ("583101", "Ballari"), ("583103", "Ballari"), ("583119", "Ballari"),
    # Haveri
    ("581110", "Haveri"), ("581111", "Haveri"), ("581204", "Haveri"),
    # Dharwad
    ("580001", "Dharwad"), ("580002", "Dharwad"), ("580008", "Dharwad"),
    # Uttara Kannada
    ("581301", "Uttara Kannada"), ("581330", "Uttara Kannada"), ("581400", "Uttara Kannada"),
    # Davanagere
    ("577001", "Davanagere"), ("577002", "Davanagere"), ("577006", "Davanagere"),
    # Shivamogga
    ("577201", "Shivamogga"), ("577202", "Shivamogga"), ("577204", "Shivamogga"),
    # Chitradurga
    ("577501", "Chitradurga"), ("577502", "Chitradurga"), ("577598", "Chitradurga"),
    # Tumakuru
    ("572101", "Tumakuru"), ("572102", "Tumakuru"), ("572201", "Tumakuru"),
    # Udupi-Chikkamagaluru
    ("576101", "Udupi-Chikkamagaluru"), ("576201", "Udupi-Chikkamagaluru"), ("577101", "Udupi-Chikkamagaluru"),
    # Dakshina Kannada
    ("575001", "Dakshina Kannada"), ("575002", "Dakshina Kannada"), ("574142", "Dakshina Kannada"),
    # Hassan
    ("573201", "Hassan"), ("573202", "Hassan"), ("573211", "Hassan"),
    # Mandya
    ("571401", "Mandya"), ("571402", "Mandya"), ("571422", "Mandya"),
    # Mysuru
    ("570001", "Mysuru"), ("570002", "Mysuru"), ("570004", "Mysuru"),
    ("570008", "Mysuru"), ("570011", "Mysuru"), ("570015", "Mysuru"),
    # Chamarajanagar
    ("571313", "Chamarajanagar"), ("571314", "Chamarajanagar"), ("571441", "Chamarajanagar"),
    # Bengaluru Rural
    ("562110", "Bengaluru Rural"), ("562111", "Bengaluru Rural"), ("562123", "Bengaluru Rural"),
    # Bengaluru North
    ("560024", "Bengaluru North"), ("560032", "Bengaluru North"), ("560045", "Bengaluru North"),
    ("560064", "Bengaluru North"), ("560092", "Bengaluru North"), ("560097", "Bengaluru North"),
    # Bengaluru Central
    ("560001", "Bengaluru Central"), ("560002", "Bengaluru Central"), ("560003", "Bengaluru Central"),
    ("560004", "Bengaluru Central"), ("560009", "Bengaluru Central"), ("560020", "Bengaluru Central"),
    ("560047", "Bengaluru Central"), ("560051", "Bengaluru Central"),
    # Bengaluru South
    ("560011", "Bengaluru South"), ("560029", "Bengaluru South"), ("560030", "Bengaluru South"),
    ("560034", "Bengaluru South"), ("560076", "Bengaluru South"), ("560083", "Bengaluru South"),
    ("560100", "Bengaluru South"),
    # Chikkaballapur
    ("562101", "Chikkaballapur"), ("562102", "Chikkaballapur"), ("562114", "Chikkaballapur"),
    # Kolar
    ("563101", "Kolar"), ("563102", "Kolar"), ("563113", "Kolar"),
]


def upgrade() -> None:
    rows = ",\n            ".join(
        f"('{pin}', (SELECT id FROM constituencies WHERE name = '{name}'))"
        for pin, name in PINCODES
    )
    op.execute(f"""
        INSERT INTO constituency_pincodes (pincode, constituency_id)
        VALUES
            {rows}
        ON DUPLICATE KEY UPDATE constituency_id = VALUES(constituency_id)
    """)


def downgrade() -> None:
    pins = ", ".join(f"'{pin}'" for pin, _ in PINCODES)
    op.execute(f"DELETE FROM constituency_pincodes WHERE pincode IN ({pins})")
