from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.system_log import SystemLog
from app.models.attendance_log import AttendanceLog
from app.schemas import SystemLogOut
from app.routers.admin_auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin Logs"], dependencies=[Depends(require_admin)])


@router.get("/logs", response_model=List[SystemLogOut])
def list_system_logs(
    module: Optional[str] = None,
    action: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """List system logs with optional filters."""
    query = db.query(SystemLog)

    if module:
        query = query.filter(SystemLog.module == module)
    if action:
        query = query.filter(SystemLog.action.ilike(f"%{action}%"))

    logs = query.order_by(SystemLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs


@router.get("/attendance-logs")
def list_attendance_logs(
    employee_id: Optional[int] = None,
    action: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """List attendance logs with optional filters."""
    query = db.query(AttendanceLog)

    if employee_id:
        query = query.filter(AttendanceLog.employee_id == employee_id)
    if action:
        query = query.filter(AttendanceLog.action == action)

    logs = query.order_by(AttendanceLog.created_at.desc()).offset(skip).limit(limit).all()

    # Include employee name
    from app.models.employee import Employee

    result = []
    for log in logs:
        emp = db.query(Employee).filter(Employee.id == log.employee_id).first()
        result.append({
            "id": log.id,
            "employee_id": log.employee_id,
            "employee_name": emp.full_name if emp else "Unknown",
            "employee_code": emp.employee_code if emp else "N/A",
            "action": log.action,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    return result