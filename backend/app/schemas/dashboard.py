from pydantic import BaseModel
from typing import List
from .attendance import AttendanceOut

class DashboardData(BaseModel):
    total_employees: int
    present_today: int
    absent_today: int
    late_today: int
    incomplete_today: int
    payroll_total: float
    recent_attendance: List[AttendanceOut]

    class Config:
        orm_mode = True