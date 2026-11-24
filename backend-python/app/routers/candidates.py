from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.dependencies import get_db, require_roles
from app.models.enums import Role
from app.models.user import User
from app.schemas.candidate import CandidateNominationRequest, UpdateCandidateProfileRequest
from app.schemas.common import ApiResponse
import app.services.candidate_service as svc

router = APIRouter()

# Only candidate accounts manage nominations; voters stand for election
# through a separate candidate account.
_candidate_only = require_roles(Role.CANDIDATE)


@router.get("/candidates/mine")
def my_nominations(
    db: Session = Depends(get_db),
    current_user: User = Depends(_candidate_only),
):
    result = svc.get_my_nominations(current_user.id, db)
    return ApiResponse.ok(result)


@router.post("/candidates/nominate")
def nominate(
    req: CandidateNominationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_candidate_only),
):
    result = svc.nominate(req, current_user.id, db)
    return ApiResponse.ok(result, "Nomination submitted")


@router.put("/candidates/profile")
def update_profile(
    req: UpdateCandidateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_candidate_only),
):
    result = svc.update_profile(req, current_user.id, db)
    return ApiResponse.ok(result)


# Declared last so literal paths like /candidates/mine match before this one.
@router.get("/candidates/{candidate_id}")
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    result = svc.get_candidate(candidate_id, db)
    return ApiResponse.ok(result)
