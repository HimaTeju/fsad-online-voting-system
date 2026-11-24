from app.models.enums import ElectionStatus
from tests.conftest import auth


def vote(client, user, election_id, candidate_id):
    return client.post(
        f"/api/elections/{election_id}/vote",
        json={"electionId": election_id, "candidateId": candidate_id},
        headers=auth(user),
    )


def test_vote_counts_once(client, make):
    seat = make.constituency("Bengaluru South")
    election = make.election(seat, ElectionStatus.VOTING_OPEN)
    cand = make.candidate(election, seat)
    voter = make.voter(seat)

    assert vote(client, voter, election.id, cand.id).status_code == 200
    again = vote(client, voter, election.id, cand.id)
    assert again.status_code == 409


def test_cannot_vote_for_candidate_from_another_election(client, make, db):
    seat = make.constituency("Bengaluru South")
    closed = make.election(seat, ElectionStatus.VOTING_CLOSED)
    other_cand = make.candidate(closed, seat)
    current = make.election(seat, ElectionStatus.VOTING_OPEN)
    make.candidate(current, seat)
    voter = make.voter(seat)

    res = vote(client, voter, current.id, other_cand.id)

    assert res.status_code == 400
    db.refresh(other_cand)
    assert other_cand.online_vote_count == 0


def test_cannot_vote_outside_own_constituency(client, make):
    south, mysuru = make.constituency("Bengaluru South"), make.constituency("Mysuru")
    election = make.election(south, ElectionStatus.VOTING_OPEN)
    cand = make.candidate(election, south)

    assert vote(client, make.voter(mysuru), election.id, cand.id).status_code == 403


def test_live_stats_use_candidate_name(client, make):
    """The frontend chart reads `candidateName`; it crashed when the API sent `name`."""
    seat = make.constituency("Bengaluru South")
    election = make.election(seat, ElectionStatus.VOTING_OPEN)
    cand = make.candidate(election, seat)
    vote(client, make.voter(seat), election.id, cand.id)

    stats = client.get(f"/api/elections/{election.id}/live-stats").json()["data"]

    assert stats["candidates"][0]["candidateName"] == cand.user.full_name
    assert stats["candidates"][0]["voteCount"] == 1
