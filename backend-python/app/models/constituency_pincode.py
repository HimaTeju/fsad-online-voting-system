from sqlalchemy import Column, String, BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class ConstituencyPincode(Base):
    __tablename__ = "constituency_pincodes"

    pincode = Column(String(6), primary_key=True)
    constituency_id = Column(BigInteger, ForeignKey("constituencies.id"), nullable=False)

    constituency = relationship("Constituency", back_populates="pincodes")
