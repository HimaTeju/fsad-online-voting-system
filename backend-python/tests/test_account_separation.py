"""Voter and candidate accounts are separate: one login never works for both.

A person who wants to vote and stand for election registers twice, with two
different email addresses: a voter account and a candidate account.
"""
import pytest

from app.models.enums import ElectionStatus, Role
from app.security.passwords import hash_password
from tests.conftest import auth


@pytest.fixture()
def seat(make):
    return make.constituency("Bengaluru South", "560076")


def login(client, user, portal, password="Secret@123"):
    return client.post("/api/auth/login", json={"email": user.email, "password": password, "portal": portal})


def with_password(db, user, password="Secret@123"):
    user.password_hash = hash_password(password)
    db.commit()
    return user


@pytest.mark.parametrize("role,own,others", [
    (Role.VOTER, "VOTER", ["CANDIDATE", "STAFF"]),
    (Role.CANDIDATE, "CANDIDATE", ["VOTER", "STAFF"]),
    (Role.ADMIN, "STAFF", ["VOTER", "CANDIDATE"]),
    (Role.FIELD_OFFICER, "STAFF", ["VOTER", "CANDIDATE"]),
])
def test_accounts_sign_in_only_on_their_own_tab(client, make, db, role, own, others):
    user = with_password(db, make.user(role))

    assert login(client, user, own).status_code == 200
    for portal in others:
        res = login(client, user, portal)
        assert res.status_code == 403
        assert "tab" in res.json()["message"]


def test_wrong_password_is_still_401_on_any_tab(client, make, db):
    user = with_password(db, make.user(Role.VOTER))

    assert login(client, user, "CANDIDATE", password="nope").status_code == 401


def test_voter_cannot_file_a_nomination_and_keeps_voter_role(client, make, db, seat):
    election = make.election(seat, ElectionStatus.NOMINATION_OPEN)
    voter = make.voter(seat)

    res = client.post("/api/candidates/nominate", headers=auth(voter), json={
        "electionId": election.id, "constituencyId": seat.id, "partyName": "Independent",
    })

    assert res.status_code == 403
    db.refresh(voter)
    assert voter.role == Role.VOTER


def test_candidate_account_cannot_vote_or_apply_for_voter_id(client, make, seat):
    election = make.election(seat, ElectionStatus.VOTING_OPEN)
    cand = make.candidate(election, seat)
    headers = auth(cand.user)

    assert client.post(f"/api/elections/{election.id}/vote", headers=headers,
                       json={"electionId": election.id, "candidateId": cand.id}).status_code == 403
    assert client.post("/api/applications", headers=headers, json={
        "fullName": "x", "dateOfBirth": "1990-01-01", "gender": "MALE",
        "address": "x", "pincode": "560076", "nationalId": "123412341234",
    }).status_code == 403
    assert client.get("/api/voter/profile", headers=headers).status_code == 403


def test_same_person_votes_and_stands_with_two_accounts(client, make, seat):
    """The voter account votes; the candidate account (different email) is on the ballot."""
    election = make.election(seat, ElectionStatus.VOTING_OPEN)
    cand = make.candidate(election, seat)
    voter = make.voter(seat)

    res = client.post(f"/api/elections/{election.id}/vote", headers=auth(voter),
                      json={"electionId": election.id, "candidateId": cand.id})

    assert res.status_code == 200


def test_candidate_signup_with_a_voter_email_is_refused(client, make, seat):
    election = make.election(seat, ElectionStatus.NOMINATION_OPEN)
    voter = make.voter(seat)

    res = client.post("/api/auth/candidate/register", json={
        "fullName": "Meera Iyer", "email": voter.email, "phone": "1",
        "electionId": election.id, "constituencyId": seat.id, "partyName": "Independent",
        "manifesto": "m", "education": "e", "criminalRecord": "None",
    })

    assert res.status_code == 400
    assert "different email" in res.json()["message"]
