from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.voter import VoterIdApplicationRequest
from app.schemas.common import ApiResponse
import app.services.voter_id_application_service as svc

router = APIRouter()


@router.post("")
def submit_application(
    req: VoterIdApplicationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = svc.submit_application(req, current_user.id, db)
    return ApiResponse.ok(result, "Application submitted successfully")


@router.get("/{application_id}/status")
def get_status(application_id: int, db: Session = Depends(get_db)):
    result = svc.get_status(application_id, db)
    return ApiResponse.ok(result)


@router.get("/mine")
def my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = svc.get_my_applications(current_user.id, db)
    return ApiResponse.ok(result)
