from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Payroll(Base):
    __tablename__ = "payroll"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    total_days = Column(Integer, default=0)
    present_days = Column(Integer, default=0)
    absent_days = Column(Integer, default=0)
    late_days = Column(Integer, default=0)
    unpaid_days = Column(Integer, default=0)
    total_salary = Column(Numeric(12, 2), default=0)
    deductions = Column(Numeric(12, 2), default=0)
    final_salary = Column(Numeric(12, 2), default=0)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee", back_populates="payroll_records")

    __table_args__ = (
        UniqueConstraint("employee_id", "month", "year", name="uq_employee_month_year"),
    )