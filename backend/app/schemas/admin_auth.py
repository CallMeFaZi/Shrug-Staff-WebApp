from pydantic import BaseModel
from typing import Optional

class PinVerify(BaseModel):
    pin: str

class PinVerifyResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    message: str