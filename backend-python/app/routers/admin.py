from fastapi import APIRouter, Depends, BackgroundTasks, File, Query, UploadFile
from sqlalchemy.orm import Session
from app.dependencies import get_db, require_roles
from app.models.user import User
from app.models.enums import Role
from app.schemas.election import CreateElectionRequest, UpdateElectionStatusRequest
from app.schemas.candidate import NominationReviewRequest
from app.schemas.result import ManualBoothResultRequest
from app.schemas.common import ApiResponse
import app.services.election_service as election_svc
import app.services.candidate_service as candidate_svc
import app.services.result_service as result_svc

router = APIRouter()

_admin = require_roles(Role.ADMIN)


@router.post("/elections")
def create_election(
    req: CreateElectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin),
):
    result = election_svc.create_election(req, current_user.id, db)
    return ApiResponse.ok(result, "Election created")


@router.get("/elections")
def list_admin_elections(
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin),
):
    result = election_svc.list_elections(db, page, size)
    return ApiResponse.ok(result)


@router.get("/elections/{election_id}")
def get_admin_election(
    election_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin),
):
    result = election_svc.get_election(election_id, db)
    return ApiResponse.ok(result)


@router.patch("/elections/{election_id}/status")
def update_election_status(
    election_id: int,
    req: UpdateElectionStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin),
):
    result = election_svc.update_status(election_id, req, current_user.id, db)
    return ApiResponse.ok(result, "Status updated")


@router.get("/nominations")
def list_nominations(
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin),
):
    result = candidate_svc.get_pending_nominations(db, page, size)
    return ApiResponse.ok(result)


@router.patch("/nominations/{candidate_id}/review")
def review_nomination(
    candidate_id: int,
    req: NominationReviewRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin),
):
    result = candidate_svc.review_nomination(candidate_id, req, current_user.id, db, background_tasks)
    return ApiResponse.ok(result, "Nomination reviewed")


@router.post("/results/{election_id}/manual")
def enter_manual_results(
    election_id: int,
    req: ManualBoothResultRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin),
):
    result = result_svc.enter_manual_results(election_id, req, current_user.id, db)
    return ApiResponse.ok(result)


@router.post("/results/{election_id}/booth-csv")
def upload_booth_csv(
    election_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin),
):
    """Upload booth vote counts as CSV; they are summed per candidate and added to online votes."""
    content = file.file.read()
    if len(content) > 2 * 1024 * 1024:
        from fastapi import HTTPException
        raise HTTPException(400, "CSV file is too large (max 2 MB)")
    result = result_svc.import_booth_csv(election_id, content, current_user.id, db)
    return ApiResponse.ok(result, "Booth results uploaded")


@router.patch("/results/{election_id}/finalize")
def finalize_results(
    election_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin),
):
    result = result_svc.finalize_results(election_id, current_user.id, db, background_tasks)
    return ApiResponse.ok(result, "Results finalized")
