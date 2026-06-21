from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SettingBase(BaseModel):
    key: str
    value: str

class SettingCreate(SettingBase):
    pass

class SettingUpdate(SettingBase):
    key: Optional[str] = None
    value: Optional[str] = None

class SettingOut(SettingBase):
    id: int
    updated_at: datetime

    class Config:
        orm_mode = True