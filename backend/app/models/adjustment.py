from sqlalchemy import Column, Integer, String, Numeric, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Adjustment(Base):
    __tablename__ = "employee_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(10), nullable=False)  # 'fine' or 'bonus'
    amount = Column(Numeric(12, 2), nullable=False, default=0)
    reason = Column(Text, nullable=False)
    adjustment_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee", backref="adjustments")