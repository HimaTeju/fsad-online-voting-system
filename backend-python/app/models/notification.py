from sqlalchemy import Column, BigInteger, ForeignKey, String, Text, Boolean, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.models.enums import NotificationType


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    recipient_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    sender_id = Column(BigInteger, ForeignKey("users.id"))
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, server_default=func.now())

    recipient = relationship(
        "User", foreign_keys=[recipient_id], back_populates="notifications_received"
    )
    sender = relationship(
        "User", foreign_keys=[sender_id], back_populates="notifications_sent"
    )
