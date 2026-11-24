from typing import Optional
from datetime import datetime
from app.models.enums import NotificationType
from app.schemas.common import CamelResponse


class NotificationResponse(CamelResponse):
    id: int
    type: NotificationType
    title: str
    body: Optional[str]
    is_read: bool
    created_at: Optional[datetime]
