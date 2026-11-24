from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.dependencies import get_db
from app.schemas.common import ApiResponse
import app.services.election_service as svc

router = APIRouter()


@router.get("/elections")
def list_elections(
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    result = svc.list_elections(db, page, size)
    return ApiResponse.ok(result)


@router.get("/elections/{election_id}")
def get_election(election_id: int, db: Session = Depends(get_db)):
    result = svc.get_election(election_id, db)
    return ApiResponse.ok(result)


@router.get("/elections/{election_id}/candidates")
def get_candidates_for_election(election_id: int, db: Session = Depends(get_db)):
    from app.services.candidate_service import get_approved_candidates
    result = get_approved_candidates(election_id, db)
    return ApiResponse.ok(result)


@router.get("/elections/{election_id}/live-stats")
def get_live_stats(election_id: int, db: Session = Depends(get_db)):
    from app.services.voting_service import get_live_stats
    result = get_live_stats(election_id, db)
    return ApiResponse.ok(result)
