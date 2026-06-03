from datetime import datetime, date, time
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


# ============== Employee ==============
class EmployeeCreate(BaseModel):
    employee_code: str
    full_name: str
    phone: Optional[str] = None
    monthly_salary: Decimal = Decimal("0")
    hourly_rate: Decimal = Decimal("0")
    shift_id: Optional[int] = None


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    monthly_salary: Optional[Decimal] = None
    hourly_rate: Optional[Decimal] = None
    shift_id: Optional[int] = None
    active: Optional[bool] = None


class EmployeeOut(BaseModel):
    id: int
    employee_code: str
    full_name: str
    phone: Optional[str] = None
    monthly_salary: Decimal
    hourly_rate: Decimal
    shift_id: Optional[int] = None
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Shift ==============
class ShiftCreate(BaseModel):
    shift_name: str
    start_time: time
    end_time: time
    grace_minutes: int = 15
    minimum_hours: Decimal = Decimal("0")


class ShiftOut(BaseModel):
    id: int
    shift_name: str
    start_time: time
    end_time: time
    grace_minutes: int
    minimum_hours: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Attendance ==============
class ClockInOut(BaseModel):
    employee_id: int
    image_data: Optional[str] = None


class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    attendance_date: date
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    total_hours: Decimal
    status: str
    payment: Decimal
    reason: Optional[str] = None
    late_minutes: Optional[Decimal] = None
    late_deduction: Optional[Decimal] = None
    created_at: datetime
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None

    class Config:
        from_attributes = True


class AttendanceFilter(BaseModel):
    employee_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None


# ============== Payroll ==============
class PayrollOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    month: int
    year: int
    total_days: int
    present_days: int
    absent_days: int
    late_days: int
    unpaid_days: int
    total_salary: Decimal
    deductions: Decimal
    final_salary: Decimal
    generated_at: datetime

    class Config:
        from_attributes = True


class PayrollGenerate(BaseModel):
    month: int
    year: int


# ============== Recognition ==============
class RecognizeResponse(BaseModel):
    matched: bool
    employee: Optional[EmployeeOut] = None
    confidence: Optional[float] = None
    message: str


# ============== Admin Auth ==============
class PinVerify(BaseModel):
    pin: str


class PinVerifyResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    message: str


# ============== Settings ==============
class SettingUpdate(BaseModel):
    items: List[dict]


class SettingOut(BaseModel):
    key: str
    value: str

    class Config:
        from_attributes = True


# ============== Dashboard ==============
class DashboardData(BaseModel):
    total_employees: int
    present_today: int
    absent_today: int
    late_today: int
    incomplete_today: int
    payroll_total: Decimal
    recent_attendance: List[AttendanceOut]


# ============== System Log ==============
class SystemLogOut(BaseModel):
    id: int
    module: str
    action: str
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Adjustment (Fine/Bonus) ==============
class AdjustmentCreate(BaseModel):
    employee_id: int
    type: str  # 'fine' or 'bonus'
    amount: Decimal
    reason: str
    adjustment_date: date


class AdjustmentOut(BaseModel):
    id: int
    employee_id: int
    type: str
    amount: Decimal
    reason: str
    adjustment_date: date
    created_at: datetime
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None

    class Config:
        from_attributes = True