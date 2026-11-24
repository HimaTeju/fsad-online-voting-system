from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.enums import NotificationType
from app.schemas.notification import NotificationResponse


def create_notification(
    db: Session,
    recipient_id: int,
    sender_id: int | None,
    type_: NotificationType,
    title: str,
    body: str | None = None,
) -> Notification:
    notification = Notification(
        recipient_id=recipient_id,
        sender_id=sender_id,
        type=type_,
        title=title,
        body=body,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_notifications(user_id: int, db: Session) -> list:
    notifs = (
        db.query(Notification)
        .filter(Notification.recipient_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return [NotificationResponse.model_validate(n) for n in notifs]


def get_unread_count(user_id: int, db: Session) -> int:
    return (
        db.query(Notification)
        .filter(Notification.recipient_id == user_id, Notification.is_read == False)
        .count()
    )


def mark_read(notification_id: int, user_id: int, db: Session) -> None:
    n = db.query(Notification).filter(
        Notification.id == notification_id, Notification.recipient_id == user_id
    ).first()
    if n:
        n.is_read = True
        db.commit()


def mark_all_read(user_id: int, db: Session) -> None:
    db.query(Notification).filter(
        Notification.recipient_id == user_id, Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
