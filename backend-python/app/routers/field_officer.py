from fastapi import APIRouter, Depends, BackgroundTasks, Query
from sqlalchemy.orm import Session
from app.dependencies import get_db, require_roles
from app.models.user import User
from app.models.enums import Role
from app.schemas.voter import ApplicationReviewRequest, ApplicationVerifyRequest, VoterListItem
from app.schemas.common import ApiResponse
import app.services.voter_id_application_service as svc

router = APIRouter()

_officer_or_admin = require_roles(Role.FIELD_OFFICER, Role.ADMIN)


@router.get("/applications")
def list_applications(
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(_officer_or_admin),
):
    result = svc.get_pending_applications(current_user, db, page, size)
    return ApiResponse.ok(result)


@router.get("/applications/{application_id}")
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_officer_or_admin),
):
    result = svc.get_status(application_id, db, current_user)
    return ApiResponse.ok(result)


@router.patch("/applications/{application_id}/review")
def review_application(
    application_id: int,
    req: ApplicationReviewRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(_officer_or_admin),
):
    result = svc.review_application(application_id, req, current_user, db, background_tasks)
    return ApiResponse.ok(result, "Application reviewed")


@router.patch("/applications/{application_id}/verify")
def verify_application(
    application_id: int,
    req: ApplicationVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_officer_or_admin),
):
    result = svc.set_physical_verified(application_id, req.is_physical_verified, current_user, db)
    return ApiResponse.ok(result, "Verification status updated")


@router.get("/voters")
def list_voters(
    db: Session = Depends(get_db),
    current_user: User = Depends(_officer_or_admin),
):
    from app.models.voter_profile import VoterProfile
    constituency_id = current_user.constituency_id
    if not constituency_id:
        return ApiResponse.ok([])
    profiles = (
        db.query(VoterProfile)
        .filter(VoterProfile.constituency_id == constituency_id)
        .join(VoterProfile.user)
        .all()
    )
    items = [
        VoterListItem(
            id=p.user.id,
            full_name=p.user.full_name,
            email=p.user.email,
            voter_id_number=p.voter_id_number,
            gender=p.gender,
            address=p.address,
            date_of_birth=p.date_of_birth,
        )
        for p in profiles
    ]
    return ApiResponse.ok(items)

