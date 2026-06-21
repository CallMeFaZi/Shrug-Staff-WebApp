from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PayrollBase(BaseModel):
    employee_id: int
    employee_name: str
    month: int
    year: int
    total_days: Optional[int] = 0
    present_days: Optional[int] = 0
    absent_days: Optional[int] = 0
    late_days: Optional[int] = 0
    unpaid_days: Optional[int] = 0
    total_salary: Optional[float] = 0.0
    deductions: Optional[float] = 0.0
    final_salary: Optional[float] = 0.0

class PayrollCreate(PayrollBase):
    pass

class PayrollUpdate(PayrollBase):
    employee_id: Optional[int] = None
    employee_name: Optional[str] = None
    month: Optional[int] = None
    year: Optional[int] = None
    total_days: Optional[int] = None
    present_days: Optional[int] = None
    absent_days: Optional[int] = None
    late_days: Optional[int] = None
    unpaid_days: Optional[int] = None
    total_salary: Optional[float] = None
    deductions: Optional[float] = None
    final_salary: Optional[float] = None

class PayrollOut(PayrollBase):
    id: int
    generated_at: datetime

    class Config:
        from_attributes = True

class PayrollGenerate(BaseModel):
    month: int
    year: int