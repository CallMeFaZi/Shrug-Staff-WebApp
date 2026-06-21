from pydantic import BaseModel
from typing import Optional
from .employee import EmployeeOut

class RecognizeResponse(BaseModel):
    matched: bool
    employee: Optional[EmployeeOut] = None
    confidence: Optional[float] = None
    message: str