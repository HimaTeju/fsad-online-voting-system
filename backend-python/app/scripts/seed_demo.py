"""Seed everything the demo needs, all in Bengaluru South.

    python -m app.scripts.seed_demo

Run it after `alembic upgrade head`, on the day of the demo. It creates:

- the Election Officer and the Bengaluru South Booth Level Officer accounts,
- the election "Bengaluru South Lok Sabha Election 2026", already open for nominations,
- six approved candidates for it, each with a candidate account.

Booth votes for these candidates are in `demo/booth_results_bengaluru_south.csv`
at the repository root, ready to upload once voting closes.

The election's dates are set relative to now, so the background scheduler (which
moves elections between stages by date) leaves it alone: the Election Officer moves
it through each stage by hand during the demo. Running the command again is safe:
anything that already exists is left as it is.
"""
import datetime as dt
import secrets
import sys

import app.database as database
import app.models  # noqa: F401  (registers every model)
from app.models import Candidate, Constituency, Election, User
from app.models.enums import ElectionStatus, ElectionType, NominationStatus, Role
from app.security.passwords import hash_password

CONSTITUENCY = "Bengaluru South"
ELECTION_TITLE = "Bengaluru South Lok Sabha Election 2026"

STAFF = [
    # (email, name, role, password, constituency)
    ("admin@voting.gov.in", "Election Officer", Role.ADMIN, "Admin@123", None),
    ("officer@voting.gov.in", "Booth Level Officer Bengaluru South", Role.FIELD_OFFICER,
     "Officer@123", CONSTITUENCY),
]

CANDIDATE_PASSWORD = "Candidate@123"
CANDIDATES = [
    # (name, email, party, education, manifesto)
    ("Lakshmi Rao", "lakshmi.rao@example.com", "Janata Progress Party", "M.A. Public Policy",
     "24x7 drinking water for every ward and a pothole-free Outer Ring Road."),
    ("Arjun Patil", "arjun.patil@example.com", "Karnataka Vikas Front", "B.E. Civil Engineering",
     "Metro feeder buses every 10 minutes and new lakes rejuvenation projects."),
    ("Farah Siddiqui", "farah.siddiqui@example.com", "Namma Bengaluru Party", "MBBS",
     "A primary health centre within 2 km of every home in Bengaluru South."),
    ("Suresh Hegde", "suresh.hegde@example.com", "Green Earth Alliance", "M.Sc. Environmental Science",
     "One lakh new trees and segregated waste collection in every layout."),
    ("Kavitha Reddy", "kavitha.reddy@example.com", "People's Welfare Party", "LL.B.",
     "Free coaching centres for government school students and safer streets for women."),
    ("Manoj Kumar", "manoj.kumar@example.com", "Independent", "B.Com.",
     "Support for small traders and street vendors, and transparent ward budgets."),
]


def _user(db, email, name, role, password, constituency_id=None):
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user, False
    user = User(
        email=email, full_name=name, role=role, password_hash=hash_password(password),
        is_active=True, email_verified=True, constituency_id=constituency_id,
    )
    db.add(user)
    db.flush()
    return user, True


def seed(db) -> list[str]:
    log = []
    seat = db.query(Constituency).filter(Constituency.name == CONSTITUENCY).first()
    if not seat:
        raise SystemExit(f"Constituency '{CONSTITUENCY}' not found. Run `alembic upgrade head` first.")

    admin = None
    for email, name, role, password, constituency in STAFF:
        user, created = _user(db, email, name, role, password, seat.id if constituency else None)
        admin = admin or user
        log.append(f"{'Created' if created else 'Exists '}  {role.value:<13} {email}  (password {password})")

    election = db.query(Election).filter(Election.title == ELECTION_TITLE).first()
    if election:
        log.append(f"Exists   election  {ELECTION_TITLE} ({election.status.value})")
    else:
        now = dt.datetime.now().replace(minute=0, second=0, microsecond=0)
        election = Election(
            title=ELECTION_TITLE,
            description="General election for the Bengaluru South parliamentary constituency.",
            election_type=ElectionType.GENERAL,
            constituency_id=seat.id,
            status=ElectionStatus.NOMINATION_OPEN,
            nomination_start=now - dt.timedelta(hours=1),
            nomination_end=now + dt.timedelta(days=7),
            voting_start=now + dt.timedelta(days=8),
            voting_end=now + dt.timedelta(days=10),
            vote_salt=secrets.token_hex(32),
            created_by=admin.id,
        )
        db.add(election)
        db.flush()
        log.append(f"Created  election  {ELECTION_TITLE} (open for nominations)")

    for name, email, party, education, manifesto in CANDIDATES:
        user, created = _user(db, email, name, Role.CANDIDATE, CANDIDATE_PASSWORD)
        if not db.query(Candidate).filter(Candidate.user_id == user.id,
                                          Candidate.election_id == election.id).first():
            db.add(Candidate(
                user_id=user.id, election_id=election.id, constituency_id=seat.id,
                party_name=party, education=education, manifesto=manifesto,
                criminal_record="None", nomination_status=NominationStatus.APPROVED,
            ))
        log.append(f"{'Created' if created else 'Exists '}  candidate {name:<15} {email}  (password {CANDIDATE_PASSWORD})")

    db.commit()
    return log


def main() -> int:
    db = database.SessionLocal()
    try:
        for line in seed(db):
            print(line)
        print("\nBooth votes to upload after voting closes: demo/booth_results_bengaluru_south.csv")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
