from sqlalchemy import Column, BigInteger, String, Enum, Integer
from sqlalchemy.orm import relationship
from app.database import Base


class Constituency(Base):
    __tablename__ = "constituencies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    state = Column(String(100), nullable=False)
    district = Column(String(100))
    seat_type = Column(Enum("GENERAL", "WOMEN_RESERVED"), nullable=False, default="GENERAL")
    total_voters = Column(Integer)
    region = Column(String(100))

    voter_profiles = relationship("VoterProfile", back_populates="constituency")
    voter_id_applications = relationship("VoterIdApplication", back_populates="constituency")
    elections = relationship("Election", back_populates="constituency")
    candidates = relationship("Candidate", back_populates="constituency")
    votes = relationship("Vote", back_populates="constituency")
    election_results = relationship("ElectionResult", back_populates="constituency")
    pincodes = relationship("ConstituencyPincode", back_populates="constituency")
    forum_threads = relationship("ForumThread", back_populates="constituency")
    chat_messages = relationship("ChatMessage", back_populates="constituency")
