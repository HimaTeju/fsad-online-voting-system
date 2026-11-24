from sqlalchemy import Column, BigInteger, String, Boolean, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.models.enums import Role


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    phone = Column(String(20))
    role = Column(Enum(Role), nullable=False, default=Role.VOTER)
    is_active = Column(Boolean, nullable=False, default=True)
    email_verified = Column(Boolean, nullable=False, default=False)
    constituency_id = Column(BigInteger, ForeignKey("constituencies.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    constituency = relationship("Constituency", foreign_keys=[constituency_id], lazy="joined")

    voter_profile = relationship("VoterProfile", back_populates="user", uselist=False)
    voter_id_applications = relationship(
        "VoterIdApplication",
        foreign_keys="VoterIdApplication.user_id",
        back_populates="user",
    )
    candidates = relationship("Candidate", back_populates="user")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user")
    notifications_received = relationship(
        "Notification", foreign_keys="Notification.recipient_id", back_populates="recipient"
    )
    notifications_sent = relationship(
        "Notification", foreign_keys="Notification.sender_id", back_populates="sender"
    )
    forum_threads = relationship("ForumThread", back_populates="author")
    forum_posts = relationship("ForumPost", back_populates="author")
    chat_messages = relationship("ChatMessage", back_populates="sender")
    audit_logs = relationship("AuditLog", back_populates="actor")
