from sqlalchemy import Column, BigInteger, ForeignKey, String, Date, Enum, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import Gender


class VoterProfile(Base):
    __tablename__ = "voter_profiles"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), unique=True, nullable=False)
    voter_id_number = Column(String(50), unique=True, nullable=False)
    constituency_id = Column(BigInteger, ForeignKey("constituencies.id"), nullable=False)
    date_of_birth = Column(Date)
    gender = Column(Enum(Gender))
    address = Column(Text)
    photo_url = Column(String(500))
    national_id = Column(String(100))

    user = relationship("User", back_populates="voter_profile")
    constituency = relationship("Constituency", back_populates="voter_profiles")
