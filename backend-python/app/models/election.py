from sqlalchemy import (
    Column, BigInteger, ForeignKey, String, Enum, DateTime, Text, Boolean
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.models.enums import ElectionStatus, ElectionType


class Election(Base):
    __tablename__ = "elections"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    election_type = Column(Enum(ElectionType), nullable=False)
    constituency_id = Column(BigInteger, ForeignKey("constituencies.id"))
    status = Column(Enum(ElectionStatus), nullable=False, default=ElectionStatus.DRAFT)
    nomination_start = Column(DateTime)
    nomination_end = Column(DateTime)
    voting_start = Column(DateTime)
    voting_end = Column(DateTime)
    vote_salt = Column(String(64), nullable=False)
    created_by = Column(BigInteger, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    constituency = relationship("Constituency", back_populates="elections")
    creator = relationship("User", foreign_keys=[created_by])
    candidates = relationship("Candidate", back_populates="election")
    votes = relationship("Vote", back_populates="election")
    results = relationship("ElectionResult", back_populates="election")
    forum_threads = relationship("ForumThread", back_populates="election")
