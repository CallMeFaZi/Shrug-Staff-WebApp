from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class AdjustmentBase(BaseModel):
    employee_id: int
    type: str  # 'fine' or 'bonus'
    amount: float
    reason: str
    adjustment_date: date

class AdjustmentCreate(AdjustmentBase):
    pass

class AdjustmentOut(AdjustmentBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True