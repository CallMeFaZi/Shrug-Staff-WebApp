from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class EmployeeBase(BaseModel):
    employee_code: str
    full_name: str
    phone: Optional[str] = None
    monthly_salary: float
    hourly_rate: float
    shift_id: Optional[int] = None
    active: Optional[bool] = True

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(EmployeeBase):
    employee_code: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    monthly_salary: Optional[float] = None
    hourly_rate: Optional[float] = None
    shift_id: Optional[int] = None
    active: Optional[bool] = None

class EmployeeOut(EmployeeBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True