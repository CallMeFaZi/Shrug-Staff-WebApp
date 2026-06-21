from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SystemLogOut(BaseModel):
    id: int
    module: str
    action: str
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True