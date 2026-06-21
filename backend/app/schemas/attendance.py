from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional

class ClockInOut(BaseModel):
    employee_id: int

class AdminClockInOut(BaseModel):
    employee_id: int
    clock_in_time: Optional[datetime] = None

class AdminClockOutOut(BaseModel):
    employee_id: int
    clock_out_time: Optional[datetime] = None

class AttendanceUpdate(BaseModel):
    clock_in_time: Optional[datetime] = None
    clock_out_time: Optional[datetime] = None

class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    attendance_date: date
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    total_hours: Optional[float] = None
    status: str
    payment: float
    reason: Optional[str] = None
    late_minutes: Optional[float] = None
    late_deduction: Optional[float] = None
    created_at: datetime

    class Config:
        orm_mode = True