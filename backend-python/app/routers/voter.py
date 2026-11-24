from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.dependencies import get_db, require_roles
from app.models.user import User
from app.models.voter_profile import VoterProfile
from app.models.enums import ElectionStatus, Role
from app.schemas.voter import VoterProfileResponse
from app.schemas.common import ApiResponse
from fastapi import HTTPException
import app.services.voting_service as voting_svc

router = APIRouter()

_voter_only = require_roles(Role.VOTER)


@router.get("/profile", response_model=ApiResponse[Optional[VoterProfileResponse]])
def get_voter_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(_voter_only),
):
    profile = db.query(VoterProfile).filter(VoterProfile.user_id == current_user.id).first()
    if not profile:
        # Not an error: the voter just hasn't got a Voter ID yet.
        return ApiResponse.ok(None, "No Voter ID yet")
    return ApiResponse.ok(
        VoterProfileResponse(
            id=profile.id,
            voter_id_number=profile.voter_id_number,
            constituency_id=profile.constituency_id,
            constituency_name=profile.constituency.name if profile.constituency else None,
            gender=profile.gender,
            address=profile.address,
            photo_url=profile.photo_url,
            full_name=current_user.full_name,
            date_of_birth=profile.date_of_birth,
        )
    )


@router.get("/elections")
def voter_elections(
    db: Session = Depends(get_db),
    current_user: User = Depends(_voter_only),
):
    """Elections this voter can take part in: their constituency's and national
    ones, newest first, each marked with whether they have already voted."""
    from sqlalchemy import or_
    from app.models.election import Election
    from app.schemas.election import VoterElectionResponse
    from app.services.election_service import _to_response

    profile = db.query(VoterProfile).filter(VoterProfile.user_id == current_user.id).first()
    if not profile:
        return ApiResponse.ok([])
    elections = (
        db.query(Election)
        .filter(
            Election.status != ElectionStatus.DRAFT,
            or_(Election.constituency_id == profile.constituency_id, Election.constituency_id.is_(None)),
        )
        .order_by(Election.voting_start.desc())
        .all()
    )
    items = [
        VoterElectionResponse(
            **_to_response(e).model_dump(),
            has_voted=voting_svc.has_voted(current_user.id, e.id, db),
        )
        for e in elections
    ]
    return ApiResponse.ok(items)


@router.get("/vote-status/{election_id}")
def vote_status(
    election_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_voter_only),
):
    voted = voting_svc.has_voted(current_user.id, election_id, db)
    return ApiResponse.ok({"voted": voted})
