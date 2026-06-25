from datetime import datetime, date, timedelta, timezone

PKT = timezone(timedelta(hours=5))
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.attendance import Attendance
from app.models.employee import Employee
from app.schemas import AttendanceOut, AdminClockInOut, AdminClockOutOut, AttendanceUpdate
from app.services.attendance_rules import clock_in_employee, clock_out_employee
from app.routers.admin_auth import require_admin

router = APIRouter(prefix="/api", tags=["Attendance"])


@router.post("/clock-in", response_model=AttendanceOut)
async def clock_in(employee_id: int, db: Session = Depends(get_db)):
    """Clock in an employee by employee_id."""
    from app.schemas import ClockInOut
    data = ClockInOut(employee_id=employee_id)
    employee = db.query(Employee).filter(Employee.id == data.employee_id, Employee.active.is_(True)).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found or inactive")

    try:
        now = datetime.now(PKT)
        attendance = clock_in_employee(db, employee_id=data.employee_id, clock_in_time=now)
        db.commit()
        db.refresh(attendance)
        return attendance
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clock-out", response_model=AttendanceOut)
async def clock_out(employee_id: int, db: Session = Depends(get_db)):
    """Clock out an employee by employee_id."""
    from app.schemas import ClockInOut
    data = ClockInOut(employee_id=employee_id)
    employee = db.query(Employee).filter(Employee.id == data.employee_id, Employee.active.is_(True)).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found or inactive")

    try:
        now = datetime.now(PKT)
        attendance = clock_out_employee(db, employee_id=data.employee_id, clock_out_time=now)
        db.commit()
        db.refresh(attendance)
        return attendance
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employee/{employee_id}", response_model=AttendanceOut)
async def get_employee(employee_id: int, db: Session = Depends(get_db)):
    """Get employee attendance for today (confirmation screen)."""
    today = date.today()
    attendance = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.attendance_date == today,
    ).first()

    if not attendance:
        raise HTTPException(status_code=404, detail="No attendance record for today")

    return attendance


# ============== Admin endpoints ==============


@router.get("/admin/attendance", response_model=List[AttendanceOut])
def list_attendance_admin(
    employee_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin),
):
    """Admin: list attendance records with filters."""
    query = db.query(Attendance)

    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
    if status:
        query = query.filter(Attendance.status == status)
    if start_date:
        query = query.filter(Attendance.attendance_date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(Attendance.attendance_date <= date.fromisoformat(end_date))

    records = query.order_by(Attendance.attendance_date.desc(), Attendance.clock_in.desc()).offset(skip).limit(limit).all()
    # Attach employee names
    from app.models.employee import Employee
    result = []
    for r in records:
        emp = db.query(Employee).filter(Employee.id == r.employee_id).first()
        record = AttendanceOut(
            id=r.id, employee_id=r.employee_id, attendance_date=r.attendance_date,
            clock_in=r.clock_in, clock_out=r.clock_out, total_hours=r.total_hours or 0,
            status=r.status, payment=r.payment or 0, reason=r.reason, created_at=r.created_at,
            employee_name=emp.full_name if emp else None,
            employee_code=emp.employee_code if emp else None,
        )
        result.append(record)
    return result


@router.get("/admin/attendance/today", response_model=List[AttendanceOut])
def today_attendance_admin(
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin),
):
    """Admin: get today's attendance records."""
    today = date.today()
    records = db.query(Attendance).filter(
        Attendance.attendance_date == today,
    ).order_by(Attendance.clock_in.desc()).all()
    return records


@router.post("/admin/attendance/{employee_id}/clock-in", response_model=AttendanceOut)
async def admin_clock_in_employee(
    employee_id: int,
    clock_in_time: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin),
):
    """Admin: clock in an employee by employee_id with optional time."""
    if clock_in_time is None:
        clock_in_time = datetime.now(PKT)
    from app.services.attendance_rules import clock_in_employee
    attendance = clock_in_employee(db, employee_id=employee_id, clock_in_time=clock_in_time)
    db.commit()
    db.refresh(attendance)
    return attendance


@router.post("/admin/attendance/{employee_id}/clock-out", response_model=AttendanceOut)
async def admin_clock_out_employee(
    employee_id: int,
    clock_out_time: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin),
):
    """Admin: clock out an employee by employee_id with optional time."""
    if clock_out_time is None:
        clock_out_time = datetime.now(PKT)
    from app.services.attendance_rules import clock_out_employee
    attendance = clock_out_employee(db, employee_id=employee_id, clock_out_time=clock_out_time)
    db.commit()
    db.refresh(attendance)
    return attendance


@router.patch("/admin/attendance/{attendance_id}", response_model=AttendanceOut)
async def admin_update_attendance(
    attendance_id: int,
    attendance_update: AttendanceUpdate,
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin),
):
    """Admin: update an attendance record by ID and recalculate fields."""
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    update_data = attendance_update.model_dump(exclude_unset=True)
    # Map schema field names to model field names
    field_mapping = {
        'clock_in_time': 'clock_in',
        'clock_out_time': 'clock_out',
    }
    for schema_field, model_field in field_mapping.items():
        if schema_field in update_data:
            value = update_data[schema_field]
            # Convert ISO string to datetime for datetime fields
            if isinstance(value, str):
                value = datetime.fromisoformat(value.replace('Z', '+00:00'))
            setattr(attendance, model_field, value)
    from app.services.attendance_rules import recalculate_attendance
    attendance = recalculate_attendance(db, attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


@router.delete("/admin/attendance/{attendance_id}")
async def admin_delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin),
):
    """Admin: delete an attendance record by ID."""
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    db.delete(attendance)
    db.commit()
    return {"message": "Attendance record deleted"}