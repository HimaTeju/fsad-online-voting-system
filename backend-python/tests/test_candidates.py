from app.models.enums import ElectionStatus, NominationStatus, Role
from tests.conftest import auth


def register(client, election_id, constituency_id, email="cand@example.com"):
    return client.post("/api/auth/candidate/register", json={
        "fullName": "Lakshmi Rao", "email": email, "phone": "+91 9000000000",
        "electionId": election_id, "constituencyId": constituency_id,
        "partyName": "Party", "manifesto": "m", "education": "e", "criminalRecord": "None",
    })


def test_my_nominations_route_is_not_shadowed(client, make):
    """/candidates/mine used to be parsed as /candidates/{id} and return 422."""
    seat = make.constituency("Bengaluru South")
    cand = make.candidate(make.election(seat), seat)

    res = client.get("/api/candidates/mine", headers=auth(cand.user))

    assert res.status_code == 200
    assert [c["id"] for c in res.json()["data"]] == [cand.id]
    assert client.get(f"/api/candidates/{cand.id}").status_code == 200


def test_public_registration_needs_open_nominations(client, make):
    seat = make.constituency("Bengaluru South")
    closed = make.election(seat, ElectionStatus.VOTING_CLOSED)

    assert register(client, closed.id, seat.id).status_code == 400


def test_public_registration_needs_matching_constituency(client, make):
    south, mysuru = make.constituency("Bengaluru South"), make.constituency("Mysuru")
    election = make.election(south)

    assert register(client, election.id, mysuru.id).status_code == 400
    assert register(client, election.id, south.id).status_code == 200


def test_approval_emails_credentials_once(client, make, sent_mail):
    seat = make.constituency("Bengaluru South")
    election = make.election(seat)
    register(client, election.id, seat.id)
    admin = make.user(Role.ADMIN)
    nomination = client.get("/api/admin/nominations", headers=auth(admin)).json()["data"][0]

    url = f"/api/admin/nominations/{nomination['id']}/review"
    assert client.patch(url, json={"approved": True}, headers=auth(admin)).status_code == 200
    assert client.patch(url, json={"approved": False, "rejectionReason": "x"},
                        headers=auth(admin)).status_code == 409
    assert [m["subject"] for m in sent_mail] == ["Your Candidate Account Credentials"]
    assert nomination["nominationStatus"] == NominationStatus.SUBMITTED.value
