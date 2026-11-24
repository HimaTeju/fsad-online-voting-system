from sqlalchemy import Column, BigInteger, ForeignKey, String, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (
        UniqueConstraint("voter_token_hash", "election_id", name="uq_voter_election"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    election_id = Column(BigInteger, ForeignKey("elections.id"), nullable=False)
    candidate_id = Column(BigInteger, ForeignKey("candidates.id"), nullable=False)
    constituency_id = Column(BigInteger, ForeignKey("constituencies.id"))
    voter_token_hash = Column(String(64), nullable=False)
    voted_at = Column(DateTime, server_default=func.now())

    election = relationship("Election", back_populates="votes")
    candidate = relationship("Candidate", back_populates="votes")
    constituency = relationship("Constituency", back_populates="votes")
