from sqlalchemy import Column, BigInteger, ForeignKey, Integer, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class ElectionResult(Base):
    __tablename__ = "election_results"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    election_id = Column(BigInteger, ForeignKey("elections.id"), nullable=False)
    candidate_id = Column(BigInteger, ForeignKey("candidates.id"), nullable=False)
    constituency_id = Column(BigInteger, ForeignKey("constituencies.id"))
    online_votes = Column(Integer, nullable=False, default=0)
    manual_booth_votes = Column(Integer, nullable=False, default=0)
    finalized = Column(Boolean, nullable=False, default=False)
    entered_by = Column(BigInteger, ForeignKey("users.id"))

    election = relationship("Election", back_populates="results")
    candidate = relationship("Candidate", back_populates="election_results")
    constituency = relationship("Constituency", back_populates="election_results")
    entered_by_user = relationship("User", foreign_keys=[entered_by])

    @property
    def total_votes(self) -> int:
        return self.online_votes + self.manual_booth_votes
