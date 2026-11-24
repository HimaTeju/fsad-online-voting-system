from typing import Optional
from datetime import datetime
from app.models.enums import ThreadType
from app.schemas.common import CamelModel, CamelResponse


class ForumThreadRequest(CamelModel):
    title: str
    body: str
    constituency_id: Optional[int] = None
    election_id: Optional[int] = None
    thread_type: ThreadType = ThreadType.DISCUSSION


class ForumPostRequest(CamelModel):
    body: str
    parent_post_id: Optional[int] = None


class ChatMessageRequest(CamelModel):
    message: str


class ForumThreadResponse(CamelResponse):
    id: int
    title: str
    body: str
    author_id: int
    author_name: Optional[str] = None
    constituency_id: Optional[int]
    election_id: Optional[int]
    thread_type: ThreadType
    pinned: bool
    created_at: Optional[datetime]


class ForumPostResponse(CamelResponse):
    id: int
    thread_id: int
    author_id: int
    author_name: Optional[str] = None
    body: str
    parent_post_id: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class ChatMessageResponse(CamelResponse):
    id: int
    room_id: str
    sender_id: int
    sender_name: Optional[str] = None
    message: str
    sent_at: Optional[datetime]
