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


def upload(client, s, text):
    return client.post(f"/api/admin/results/{s['election'].id}/booth-csv", headers=auth(s["admin"]),
                       files={"file": ("booths.csv", text.encode(), "text/csv")})


def test_booth_csv_is_summed_and_added_to_online_votes(client, setup, db):
    a, b = setup["a"], setup["b"]
    # One online vote for A, cast while voting was open.
    from app.models import Vote
    db.add(Vote(election_id=setup["election"].id, candidate_id=a.id,
                constituency_id=setup["seat"].id, voter_token_hash="x" * 64))
    db.commit()

    csv = (
        "booth,candidate_id,candidate_name,votes\n"
        f"Booth 1,{a.id},{a.user.full_name},10\n"
        f"Booth 1,{b.id},{b.user.full_name},20\n"
        f"Booth 2,{a.id},,5\n"
        f"Booth 2,,{b.user.full_name},7\n"
    )
    res = upload(client, setup, "﻿" + csv)  # Excel-style BOM

    assert res.status_code == 200, res.json()
    data = res.json()["data"]
    assert (data["booths"], data["rows"], data["boothVotes"]) == (2, 4, 42)
    by_id = {r["candidateId"]: r for r in data["results"]["results"]}
    assert (by_id[a.id]["onlineVotes"], by_id[a.id]["manualBoothVotes"], by_id[a.id]["totalVotes"]) == (1, 15, 16)
    assert (by_id[b.id]["manualBoothVotes"], by_id[b.id]["totalVotes"]) == (27, 27)
    assert by_id[b.id]["winner"] is True


def test_booth_csv_upload_replaces_earlier_counts(client, setup):
    a = setup["a"]
    upload(client, setup, f"booth,candidate_id,votes\nB1,{a.id},50\n")
    res = upload(client, setup, f"booth,candidate_id,votes\nB1,{a.id},8\n")

    totals = {r["candidateId"]: r["manualBoothVotes"] for r in res.json()["data"]["results"]["results"]}
    assert totals == {a.id: 8, setup["b"].id: 0}


@pytest.mark.parametrize("csv,error", [
    ("name,count\nx,1\n", "header must include"),
    ("booth,candidate_id,votes\n", "no data rows"),
    ("booth,candidate_id,votes\nB1,999,5\n", "not a candidate in this election"),
    ("booth,candidate_name,votes\nB1,Nobody,5\n", "no candidate named"),
    ("booth,candidate_id,votes\nB1,{a},-3\n", "whole number"),
    ("booth,candidate_id,votes\nB1,{a},abc\n", "whole number"),
    ("booth,candidate_id,votes\nB1,{a},1\nB1,{a},2\n", "more than one row"),
])
def test_booth_csv_rejects_bad_files(client, setup, csv, error):
    res = upload(client, setup, csv.format(a=setup["a"].id))

    assert res.status_code == 400
    assert error in res.json()["message"]


def test_booth_csv_refused_after_finalise(client, setup):
    finalize(client, setup)

    res = upload(client, setup, f"booth,candidate_id,votes\nB1,{setup['a'].id},5\n")

    assert res.status_code == 409
