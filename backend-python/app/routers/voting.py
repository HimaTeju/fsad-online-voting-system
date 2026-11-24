from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.models.enums import Role
from app.dependencies import get_db, require_roles
from app.models.user import User
from app.schemas.result import CastVoteRequest
from app.schemas.common import ApiResponse
import app.services.voting_service as svc

router = APIRouter()

_voter_only = require_roles(Role.VOTER)


@router.post("/{election_id}/vote")
def cast_vote(
    election_id: int,
    req: CastVoteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(_voter_only),
):
    req.election_id = election_id
    result = svc.cast_vote(req, current_user.id, db, background_tasks)
    return ApiResponse.ok(result)


@router.get("/{election_id}/vote-status")
def vote_status(
    election_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_voter_only),
):
    voted = svc.has_voted(current_user.id, election_id, db)
    return ApiResponse.ok({"voted": voted})
