import pytest

from app.models import Notification
from app.models.enums import ElectionStatus, Role
from tests.conftest import auth


@pytest.fixture()
def setup(make):
    seat = make.constituency("Bengaluru South")
    election = make.election(seat, ElectionStatus.VOTING_CLOSED)
    a, b = make.candidate(election, seat), make.candidate(election, seat)
    return {"seat": seat, "election": election, "a": a, "b": b,
            "admin": make.user(Role.ADMIN), "voter": make.voter(seat)}


def booth(client, s, votes):
    return client.post(f"/api/admin/results/{s['election'].id}/manual", headers=auth(s["admin"]),
                       json={"results": [{"candidateId": c.id, "manualBoothVotes": v} for c, v in votes]})


def finalize(client, s):
    return client.patch(f"/api/admin/results/{s['election'].id}/finalize", headers=auth(s["admin"]))


def test_results_can_only_be_declared_by_finalising(client, setup):
    res = client.patch(f"/api/admin/elections/{setup['election'].id}/status",
                       json={"status": "RESULTS_DECLARED"}, headers=auth(setup["admin"]))
    assert res.status_code == 400


def test_finalise_locks_results_and_announces_them(client, setup, db, sent_mail):
    assert booth(client, setup, [(setup["a"], 10), (setup["b"], 25)]).status_code == 200

    res = finalize(client, setup)

    assert res.status_code == 200
    data = res.json()["data"]
    assert data["finalized"] is True
    winner = [r for r in data["results"] if r["winner"]]
    assert [w["candidateId"] for w in winner] == [setup["b"].id]
    assert winner[0]["candidateName"] == setup["b"].user.full_name
    db.refresh(setup["election"])
    assert setup["election"].status == ElectionStatus.RESULTS_DECLARED

    assert booth(client, setup, [(setup["a"], 999)]).status_code == 409
    assert finalize(client, setup).status_code == 409

    assert len([m for m in sent_mail if m["subject"].startswith("Results Declared")]) == 2
    assert db.query(Notification).filter_by(recipient_id=setup["voter"].id).count() == 1


def test_online_only_election_can_be_finalised(client, setup):
    data = finalize(client, setup).json()["data"]

    assert data["finalized"] is True
    assert len(data["results"]) == 2


def test_cannot_finalise_while_voting_open(client, make, setup, db):
    setup["election"].status = ElectionStatus.VOTING_OPEN
    db.commit()

    assert finalize(client, setup).status_code == 400


def test_booth_counts_only_for_this_elections_candidates(client, make, setup):
    stranger = make.candidate(make.election(setup["seat"]), setup["seat"])

    assert booth(client, setup, [(stranger, 5)]).status_code == 400
    assert booth(client, setup, [(setup["a"], -1)]).status_code == 400
