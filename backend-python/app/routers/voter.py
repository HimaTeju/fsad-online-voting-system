from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.voter_profile import VoterProfile
from app.models.enums import ElectionStatus
from app.schemas.voter import VoterProfileResponse
from app.schemas.common import ApiResponse
from fastapi import HTTPException
import app.services.voting_service as voting_svc

router = APIRouter()


@router.get("/profile", response_model=ApiResponse[VoterProfileResponse])
def get_voter_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(VoterProfile).filter(VoterProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(404, "Voter profile not found")
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
    current_user: User = Depends(get_current_user),
):
    from app.models.election import Election
    profile = db.query(VoterProfile).filter(VoterProfile.user_id == current_user.id).first()
    if not profile:
        elections = []
    else:
        elections = db.query(Election).filter(
            Election.status == ElectionStatus.VOTING_OPEN
        ).all()
        from app.services.election_service import _to_response
        elections = [_to_response(e) for e in elections]
    return ApiResponse.ok(elections)


@router.get("/vote-status/{election_id}")
def vote_status(
    election_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    voted = voting_svc.has_voted(current_user.id, election_id, db)
    return ApiResponse.ok({"voted": voted})
