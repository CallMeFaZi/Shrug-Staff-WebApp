from pydantic import BaseModel
from datetime import datetime, time
from typing import Optional

class ShiftBase(BaseModel):
    shift_name: str
    start_time: time
    end_time: time
    grace_minutes: Optional[int] = 15
    minimum_hours: Optional[float] = 0.0

class ShiftCreate(ShiftBase):
    pass

class ShiftUpdate(ShiftBase):
    shift_name: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    grace_minutes: Optional[int] = None
    minimum_hours: Optional[float] = None

class ShiftOut(ShiftBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True