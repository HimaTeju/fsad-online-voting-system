import pytest

from app.models import VoterProfile
from app.models.enums import Role
from tests.conftest import auth


@pytest.fixture()
def seats(make):
    return make.constituency("Bengaluru South", "560076"), make.constituency("Mysuru", "570001")


@pytest.fixture()
def officer(make, seats):
    return make.user(Role.FIELD_OFFICER, constituency=seats[0])


def apply(client, user, pincode="560076", national_id="123412341234"):
    return client.post("/api/applications", headers=auth(user), json={
        "fullName": user.full_name, "dateOfBirth": "1995-01-01", "gender": "FEMALE",
        "address": "1 Main Road", "pincode": pincode, "nationalId": national_id,
    })


def verify(client, officer, app_id):
    return client.patch(f"/api/field-officer/applications/{app_id}/verify",
                        json={"isPhysicalVerified": True}, headers=auth(officer))


def review(client, officer, app_id, approved, remarks=""):
    return client.patch(f"/api/field-officer/applications/{app_id}/review",
                        json={"approved": approved, "remarks": remarks}, headers=auth(officer))


def test_full_approval_creates_voter_id(client, make, officer, db, sent_mail):
    voter = make.user()
    app_id = apply(client, voter).json()["data"]["id"]

    assert verify(client, officer, app_id).status_code == 200
    assert review(client, officer, app_id, True).status_code == 200

    profile = db.query(VoterProfile).filter_by(user_id=voter.id).one()
    assert profile.voter_id_number
    assert any(m["to"] == voter.email and "Approved" in m["subject"] for m in sent_mail)


def test_approval_requires_physical_verification(client, make, officer):
    app_id = apply(client, make.user()).json()["data"]["id"]

    res = review(client, officer, app_id, True)

    assert res.status_code == 400


def test_officer_only_sees_and_reviews_own_constituency(client, make, officer):
    apply(client, make.user(), pincode="560076", national_id="111111111111")
    other = apply(client, make.user(), pincode="570001", national_id="222222222222").json()["data"]

    queue = client.get("/api/field-officer/applications", headers=auth(officer)).json()["data"]

    assert [a["constituencyName"] for a in queue] == ["Bengaluru South"]
    assert verify(client, officer, other["id"]).status_code == 403
    assert review(client, officer, other["id"], False, "x").status_code == 403


def test_admin_sees_every_constituency(client, make, seats):
    apply(client, make.user(), pincode="560076", national_id="111111111111")
    apply(client, make.user(), pincode="570001", national_id="222222222222")
    admin = make.user(Role.ADMIN)

    queue = client.get("/api/field-officer/applications", headers=auth(admin)).json()["data"]

    assert len(queue) == 2


def test_reviewed_application_cannot_be_reviewed_again(client, make, officer):
    app_id = apply(client, make.user()).json()["data"]["id"]
    verify(client, officer, app_id)
    review(client, officer, app_id, True)

    assert review(client, officer, app_id, False, "changed my mind").status_code == 409


def test_rejection_needs_a_reason(client, make, officer):
    app_id = apply(client, make.user()).json()["data"]["id"]

    assert review(client, officer, app_id, False, "").status_code == 400
    assert review(client, officer, app_id, False, "Documents unreadable").status_code == 200


def test_voter_with_an_id_cannot_apply_again(client, make, seats):
    voter = make.voter(seats[0])  # e.g. an account claimed from an existing Voter ID

    assert apply(client, voter).status_code == 409


def test_only_one_open_application_per_voter(client, make, seats):
    voter = make.user()
    assert apply(client, voter, national_id="111111111111").status_code == 200

    assert apply(client, voter, national_id="222222222222").status_code == 409


def test_application_status_is_private(client, make, seats):
    owner, stranger = make.user(), make.user()
    app_id = apply(client, owner).json()["data"]["id"]

    assert client.get(f"/api/applications/{app_id}/status").status_code == 401
    assert client.get(f"/api/applications/{app_id}/status", headers=auth(stranger)).status_code == 404
    assert client.get(f"/api/applications/{app_id}/status", headers=auth(owner)).status_code == 200
