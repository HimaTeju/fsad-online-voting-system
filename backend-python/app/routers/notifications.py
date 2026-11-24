from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
import app.services.notification_service as svc

router = APIRouter()


@router.get("")
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = svc.get_notifications(current_user.id, db)
    return ApiResponse.ok(result)


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = svc.get_unread_count(current_user.id, db)
    return ApiResponse.ok({"count": count})


@router.patch("/{notification_id}/read")
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc.mark_read(notification_id, current_user.id, db)
    return ApiResponse.ok(message="Marked as read")


@router.patch("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc.mark_all_read(current_user.id, db)
    return ApiResponse.ok(message="All notifications marked as read")
