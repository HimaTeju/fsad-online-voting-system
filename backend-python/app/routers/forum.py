from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.forum import ForumThreadRequest, ForumPostRequest, ChatMessageRequest
from app.schemas.common import ApiResponse
from app.models.chat_message import ChatMessage
import app.services.forum_service as svc

router = APIRouter()


@router.post("/threads")
def create_thread(
    req: ForumThreadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = svc.create_thread(req, current_user.id, current_user.role, db)
    return ApiResponse.ok(result, "Thread created")


@router.get("/threads/constituency/{constituency_id}")
def threads_by_constituency(constituency_id: int, db: Session = Depends(get_db)):
    result = svc.get_threads_by_constituency(constituency_id, db)
    return ApiResponse.ok(result)


@router.get("/threads/election/{election_id}")
def threads_by_election(election_id: int, db: Session = Depends(get_db)):
    result = svc.get_threads_by_election(election_id, db)
    return ApiResponse.ok(result)


@router.post("/threads/{thread_id}/posts")
def create_post(
    thread_id: int,
    req: ForumPostRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = svc.create_post(thread_id, req, current_user.id, db)
    return ApiResponse.ok(result)


@router.get("/threads/{thread_id}/posts")
def get_posts(thread_id: int, db: Session = Depends(get_db)):
    result = svc.get_posts(thread_id, db)
    return ApiResponse.ok(result)


@router.put("/posts/{post_id}")
def edit_post(
    post_id: int,
    req: ForumPostRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = svc.edit_post(post_id, req, current_user.id, db)
    return ApiResponse.ok(result)


@router.delete("/posts/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc.delete_post(post_id, current_user.id, current_user.role, db)
    return ApiResponse.ok(message="Post deleted")


@router.get("/chat/{room_id}/history")
def chat_history(room_id: str, db: Session = Depends(get_db)):
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.room_id == room_id)
        .order_by(ChatMessage.sent_at.asc())
        .limit(100)
        .all()
    )
    from app.schemas.forum import ChatMessageResponse
    result = [
        ChatMessageResponse(
            id=m.id,
            room_id=m.room_id,
            sender_id=m.sender_id,
            sender_name=m.sender.full_name if m.sender else None,
            message=m.message,
            sent_at=m.sent_at,
        )
        for m in messages
    ]
    return ApiResponse.ok(result)
