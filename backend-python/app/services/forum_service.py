from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.forum import ForumThread, ForumPost
from app.models.enums import ThreadType, Role
from app.schemas.forum import ForumThreadRequest, ForumPostRequest, ForumThreadResponse, ForumPostResponse


def _thread_response(t: ForumThread) -> ForumThreadResponse:
    return ForumThreadResponse(
        id=t.id,
        title=t.title,
        body=t.body,
        author_id=t.author_id,
        author_name=t.author.full_name if t.author else None,
        constituency_id=t.constituency_id,
        election_id=t.election_id,
        thread_type=t.thread_type,
        pinned=t.pinned,
        created_at=t.created_at,
    )


def _post_response(p: ForumPost) -> ForumPostResponse:
    return ForumPostResponse(
        id=p.id,
        thread_id=p.thread_id,
        author_id=p.author_id,
        author_name=p.author.full_name if p.author else None,
        body=p.body,
        parent_post_id=p.parent_post_id,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


def create_thread(req: ForumThreadRequest, user_id: int, user_role: Role, db: Session) -> ForumThreadResponse:
    if req.thread_type == ThreadType.CAMPAIGN and user_role != Role.CANDIDATE:
        raise HTTPException(403, "Only candidates can create CAMPAIGN threads")
    thread = ForumThread(
        title=req.title,
        body=req.body,
        author_id=user_id,
        constituency_id=req.constituency_id,
        election_id=req.election_id,
        thread_type=req.thread_type,
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return _thread_response(thread)


def get_threads_by_constituency(constituency_id: int, db: Session) -> list:
    threads = db.query(ForumThread).filter(ForumThread.constituency_id == constituency_id).all()
    return [_thread_response(t) for t in threads]


def get_threads_by_election(election_id: int, db: Session) -> list:
    threads = db.query(ForumThread).filter(ForumThread.election_id == election_id).all()
    return [_thread_response(t) for t in threads]


def create_post(thread_id: int, req: ForumPostRequest, user_id: int, db: Session) -> ForumPostResponse:
    thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
    if not thread:
        raise HTTPException(404, "Thread not found")
    post = ForumPost(
        thread_id=thread_id,
        author_id=user_id,
        body=req.body,
        parent_post_id=req.parent_post_id,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _post_response(post)


def get_posts(thread_id: int, db: Session) -> list:
    posts = db.query(ForumPost).filter(
        ForumPost.thread_id == thread_id,
        ForumPost.parent_post_id == None,
    ).all()
    return [_post_response(p) for p in posts]


def edit_post(post_id: int, req: ForumPostRequest, user_id: int, db: Session) -> ForumPostResponse:
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    if post.author_id != user_id:
        raise HTTPException(403, "You can only edit your own posts")
    post.body = req.body
    db.commit()
    db.refresh(post)
    return _post_response(post)


def delete_post(post_id: int, user_id: int, user_role: Role, db: Session) -> None:
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    if post.author_id != user_id and user_role != Role.ADMIN:
        raise HTTPException(403, "Insufficient permissions")
    db.delete(post)
    db.commit()
