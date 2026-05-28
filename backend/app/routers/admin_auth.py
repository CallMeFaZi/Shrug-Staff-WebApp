from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import PinVerify, PinVerifyResponse
from app.models.setting import Setting
from app.models.system_log import SystemLog
from app.utils import create_admin_token, verify_admin_token

router = APIRouter(prefix="/api/admin", tags=["Admin Auth"])
security = HTTPBearer(auto_error=False)


@router.post("/verify-pin", response_model=PinVerifyResponse)
def verify_pin(data: PinVerify, db: Session = Depends(get_db)):
    """
    Verify admin PIN. Returns a session token if correct.
    Default PIN: 969600
    """
    pin_setting = db.query(Setting).filter(Setting.key == "admin_pin").first()
    stored_pin = pin_setting.value if pin_setting else "969600"

    if data.pin != stored_pin:
        log = SystemLog(
            module="admin_auth",
            action="pin_failed",
            details="Failed PIN attempt",
        )
        db.add(log)
        db.commit()

        return PinVerifyResponse(
            success=False,
            token=None,
            message="Invalid PIN. Please try again.",
        )

    # Generate token
    token = create_admin_token()

    log = SystemLog(
        module="admin_auth",
        action="pin_success",
        details="Admin logged in successfully",
    )
    db.add(log)
    db.commit()

    return PinVerifyResponse(
        success=True,
        token=token,
        message="PIN verified successfully.",
    )


def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Dependency to protect admin routes."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Admin authentication required")

    token = credentials.credentials
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Invalid or expired admin token")

    return True