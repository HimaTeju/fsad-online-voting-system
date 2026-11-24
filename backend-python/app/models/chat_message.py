from sqlalchemy import Column, BigInteger, ForeignKey, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    room_id = Column(String(100), nullable=False)
    sender_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    constituency_id = Column(BigInteger, ForeignKey("constituencies.id"))
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime, server_default=func.now())

    sender = relationship("User", back_populates="chat_messages")
    constituency = relationship("Constituency", back_populates="chat_messages")
