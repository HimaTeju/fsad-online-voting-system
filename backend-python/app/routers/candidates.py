from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.candidate import CandidateNominationRequest, UpdateCandidateProfileRequest
from app.schemas.common import ApiResponse
import app.services.candidate_service as svc

router = APIRouter()


@router.get("/candidates/{candidate_id}")
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    result = svc.get_candidate(candidate_id, db)
    return ApiResponse.ok(result)


@router.post("/candidates/nominate")
def nominate(
    req: CandidateNominationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = svc.nominate(req, current_user.id, db)
    return ApiResponse.ok(result, "Nomination submitted")


@router.put("/candidates/profile")
def update_profile(
    req: UpdateCandidateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = svc.update_profile(req, current_user.id, db)
    return ApiResponse.ok(result)


@router.get("/candidates/mine")
def my_nominations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = svc.get_my_nominations(current_user.id, db)
    return ApiResponse.ok(result)
