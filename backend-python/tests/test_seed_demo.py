from pathlib import Path

from app.models import Candidate, Election, User
from app.models.enums import ElectionStatus, NominationStatus, Role
from app.scripts import seed_demo
from tests.conftest import auth

DEMO_CSV = Path(__file__).resolve().parents[2] / "demo" / "booth_results_bengaluru_south.csv"


def test_seed_creates_the_bengaluru_south_demo_and_is_rerunnable(db, make):
    make.constituency("Bengaluru South")

    seed_demo.seed(db)
    seed_demo.seed(db)  # running twice must not duplicate anything

    election = db.query(Election).one()
    assert election.title == seed_demo.ELECTION_TITLE
    assert election.status == ElectionStatus.NOMINATION_OPEN
    candidates = db.query(Candidate).filter_by(election_id=election.id).all()
    assert len(candidates) == 6
    assert all(c.nomination_status == NominationStatus.APPROVED for c in candidates)
    assert db.query(User).filter_by(role=Role.ADMIN).count() == 1
    officer = db.query(User).filter_by(role=Role.FIELD_OFFICER).one()
    assert officer.constituency.name == "Bengaluru South"


def test_seeded_candidates_can_sign_in(client, db, make):
    make.constituency("Bengaluru South")
    seed_demo.seed(db)

    res = client.post("/api/auth/login", json={
        "email": "lakshmi.rao@example.com", "password": seed_demo.CANDIDATE_PASSWORD, "portal": "CANDIDATE",
    })

    assert res.status_code == 200


def test_demo_csv_matches_the_seeded_candidates(client, db, make):
    make.constituency("Bengaluru South")
    seed_demo.seed(db)
    election = db.query(Election).one()
    election.status = ElectionStatus.VOTING_CLOSED
    db.commit()
    admin = db.query(User).filter_by(role=Role.ADMIN).one()

    res = client.post(f"/api/admin/results/{election.id}/booth-csv", headers=auth(admin),
                      files={"file": (DEMO_CSV.name, DEMO_CSV.read_bytes(), "text/csv")})

    assert res.status_code == 200, res.json()
    data = res.json()["data"]
    assert (data["booths"], data["rows"], data["boothVotes"]) == (5, 30, 708)
    winner = [r for r in data["results"]["results"] if r["winner"]]
    assert [w["candidateName"] for w in winner] == ["Lakshmi Rao"]
