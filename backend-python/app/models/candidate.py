from sqlalchemy import (
    Column, BigInteger, ForeignKey, String, Enum, Text, Integer
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import NominationStatus


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    election_id = Column(BigInteger, ForeignKey("elections.id"), nullable=False)
    constituency_id = Column(BigInteger, ForeignKey("constituencies.id"), nullable=False)
    party_name = Column(String(150))
    party_symbol_url = Column(String(500))
    manifesto = Column(Text)
    education = Column(String(255))
    criminal_record = Column(Text)
    photo_url = Column(String(500))
    nomination_status = Column(
        Enum(NominationStatus), nullable=False, default=NominationStatus.SUBMITTED
    )
    rejection_reason = Column(Text)
    online_vote_count = Column(Integer, nullable=False, default=0)

    user = relationship("User", back_populates="candidates")
    election = relationship("Election", back_populates="candidates")
    constituency = relationship("Constituency", back_populates="candidates")
    votes = relationship("Vote", back_populates="candidate")
    election_results = relationship("ElectionResult", back_populates="candidate")
