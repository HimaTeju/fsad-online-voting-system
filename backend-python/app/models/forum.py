from sqlalchemy import (
    Column, BigInteger, ForeignKey, String, Text, Boolean, Enum, DateTime
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.models.enums import ThreadType


class ForumThread(Base):
    __tablename__ = "forum_threads"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    author_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    constituency_id = Column(BigInteger, ForeignKey("constituencies.id"))
    election_id = Column(BigInteger, ForeignKey("elections.id"))
    thread_type = Column(Enum(ThreadType), nullable=False, default=ThreadType.DISCUSSION)
    pinned = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    author = relationship("User", back_populates="forum_threads")
    constituency = relationship("Constituency", back_populates="forum_threads")
    election = relationship("Election", back_populates="forum_threads")
    posts = relationship("ForumPost", back_populates="thread", cascade="all, delete-orphan")


class ForumPost(Base):
    __tablename__ = "forum_posts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    thread_id = Column(BigInteger, ForeignKey("forum_threads.id"), nullable=False)
    author_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    parent_post_id = Column(BigInteger, ForeignKey("forum_posts.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    thread = relationship("ForumThread", back_populates="posts")
    author = relationship("User", back_populates="forum_posts")
    replies = relationship("ForumPost", backref="parent_post", remote_side=[id])
