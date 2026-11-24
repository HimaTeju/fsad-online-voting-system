from sqlalchemy import Column, BigInteger, ForeignKey, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    actor_id = Column(BigInteger, ForeignKey("users.id"))
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100))
    entity_id = Column(BigInteger)
    description = Column(Text)
    ip_address = Column(String(45))
    created_at = Column(DateTime, server_default=func.now())

    actor = relationship("User", back_populates="audit_logs")
