"""Demo voter profiles — 5 pre-existing Karnataka voters for account-claim flow testing

Revision ID: 002
Revises: 001
Create Date: 2024-01-02 00:00:00
"""
from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Insert 5 demo voter users with placeholder emails (not yet claimed).
    # password_hash '$' is an invalid bcrypt hash — login via email+password
    # is impossible until the user completes the account-claim flow and sets
    # a real password.
    op.execute("""
        INSERT INTO users (email, password_hash, full_name, role, is_active, email_verified)
        VALUES
          ('unclaimed_1@placeholder.invalid', '$', 'Priya Sharma',   'VOTER', TRUE, FALSE),
          ('unclaimed_2@placeholder.invalid', '$', 'Ravi Kumar',     'VOTER', TRUE, FALSE),
          ('unclaimed_3@placeholder.invalid', '$', 'Anitha Reddy',   'VOTER', TRUE, FALSE),
          ('unclaimed_4@placeholder.invalid', '$', 'Suresh Gowda',   'VOTER', TRUE, FALSE),
          ('unclaimed_5@placeholder.invalid', '$', 'Deepa Nair',     'VOTER', TRUE, FALSE)
    """)

    # Insert voter_profiles linked to the users above.
    # constituency_id values must match rows already seeded by V5 migration:
    #   Bengaluru Central, Bengaluru South, Mysuru, Bengaluru North
    op.execute("""
        INSERT INTO voter_profiles (user_id, voter_id_number, constituency_id, gender, date_of_birth, address, national_id)
        SELECT
            u.id,
            vd.voter_id_number,
            c.id,
            vd.gender,
            vd.dob,
            vd.address,
            vd.national_id
        FROM (
            SELECT 'unclaimed_1@placeholder.invalid' AS email, 'VID-BNCS-2024-000001' AS voter_id_number, 'Bengaluru Central' AS constituency, 'FEMALE' AS gender, '1990-05-14' AS dob, '12 MG Road, Bengaluru' AS address, '123456789001' AS national_id
            UNION ALL
            SELECT 'unclaimed_2@placeholder.invalid', 'VID-BNCS-2024-000002', 'Bengaluru Central', 'MALE',   '1985-11-22', '34 Richmond Road, Bengaluru', '123456789002'
            UNION ALL
            SELECT 'unclaimed_3@placeholder.invalid', 'VID-BNSTH-2024-000001', 'Bengaluru South',  'FEMALE', '1992-03-08', '7 JP Nagar, Bengaluru',       '123456789003'
            UNION ALL
            SELECT 'unclaimed_4@placeholder.invalid', 'VID-MYS-2024-000001',  'Mysuru',            'MALE',   '1978-07-30', '5 Sayyaji Rao Road, Mysuru',   '123456789004'
            UNION ALL
            SELECT 'unclaimed_5@placeholder.invalid', 'VID-BNNTH-2024-000001','Bengaluru North',   'FEMALE', '1995-01-19', '88 Yelahanka, Bengaluru',      '123456789005'
        ) AS vd
        JOIN users u ON u.email = vd.email
        JOIN constituencies c ON c.name = vd.constituency
    """)


def downgrade() -> None:
    op.execute("""
        DELETE vp FROM voter_profiles vp
        JOIN users u ON u.id = vp.user_id
        WHERE u.email LIKE 'unclaimed_%@placeholder.invalid'
    """)
    op.execute("""
        DELETE FROM users WHERE email LIKE 'unclaimed_%@placeholder.invalid'
    """)
