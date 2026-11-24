from sqlalchemy import (
    Column, BigInteger, ForeignKey, String, Date, Enum, DateTime, Text, Boolean
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.models.enums import Gender, ApplicationStatus


class VoterIdApplication(Base):
    __tablename__ = "voter_id_applications"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    full_name = Column(String(150), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(Enum(Gender), nullable=False)
    address = Column(Text, nullable=False)
    constituency_id = Column(BigInteger, ForeignKey("constituencies.id"))
    photo_url = Column(String(500))
    national_id = Column(String(100), nullable=False)
    status = Column(Enum(ApplicationStatus), nullable=False, default=ApplicationStatus.PENDING)
    reviewed_by = Column(BigInteger, ForeignKey("users.id"))
    remarks = Column(Text)
    is_physical_verified = Column(Boolean, nullable=False, default=False)
    submitted_at = Column(DateTime, server_default=func.now())
    reviewed_at = Column(DateTime)

    user = relationship("User", foreign_keys=[user_id], back_populates="voter_id_applications")
    constituency = relationship("Constituency", back_populates="voter_id_applications")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
