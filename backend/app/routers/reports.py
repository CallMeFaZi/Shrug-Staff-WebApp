from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.attendance import Attendance
from app.models.employee import Employee
from app.models.payroll import Payroll
from app.routers.admin_auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin Reports"], dependencies=[Depends(require_admin)])


@router.get("/reports/attendance-trend")
def attendance_trend(days: int = 30, db: Session = Depends(get_db)):
    """
    Get attendance trend data for the last N days.
    Returns daily counts of present/absent/late.
    """
    start_date = date.today() - timedelta(days=days)

    records = db.query(
        Attendance.attendance_date,
        Attendance.status,
        func.count(Attendance.id).label("count"),
    ).filter(
        Attendance.attendance_date >= start_date,
    ).group_by(
        Attendance.attendance_date,
        Attendance.status,
    ).order_by(
        Attendance.attendance_date,
    ).all()

    # Group by date
    trend_data = {}
    for record in records:
        date_str = record.attendance_date.isoformat()
        if date_str not in trend_data:
            trend_data[date_str] = {"date": date_str, "present": 0, "absent": 0, "late": 0, "incomplete": 0}

        if record.status in trend_data[date_str]:
            trend_data[date_str][record.status] = record.count

    return list(trend_data.values())


@router.get("/reports/payroll-trend")
def payroll_trend(months: int = 6, db: Session = Depends(get_db)):
    """
    Get payroll trend data for the last N months.
    """
    from datetime import datetime

    today = date.today()
    records = []

    for i in range(months):
        m = today.month - i
        y = today.year
        if m <= 0:
            m += 12
            y -= 1

        summary = db.query(
            func.sum(Payroll.total_salary).label("total_salary"),
            func.sum(Payroll.deductions).label("total_deductions"),
            func.sum(Payroll.final_salary).label("final_salary"),
            func.count(Payroll.id).label("employee_count"),
        ).filter(
            Payroll.month == m,
            Payroll.year == y,
        ).first()

        records.append({
            "month": m,
            "year": y,
            "total_salary": float(summary.total_salary or 0),
            "deductions": float(summary.total_deductions or 0),
            "final_salary": float(summary.final_salary or 0),
            "employee_count": summary.employee_count or 0,
        })

    return records


@router.get("/reports/employee-summary")
def employee_summary(db: Session = Depends(get_db)):
    """
    Summary stats for each employee.
    """
    employees = db.query(Employee).filter(Employee.active.is_(True)).all()
    result = []

    for emp in employees:
        total_attendance = db.query(func.count(Attendance.id)).filter(
            Attendance.employee_id == emp.id,
        ).scalar() or 0

        present_count = db.query(func.count(Attendance.id)).filter(
            Attendance.employee_id == emp.id,
            Attendance.status == "present",
        ).scalar() or 0

        late_count = db.query(func.count(Attendance.id)).filter(
            Attendance.employee_id == emp.id,
            Attendance.status == "late",
        ).scalar() or 0

        absent_count = db.query(func.count(Attendance.id)).filter(
            Attendance.employee_id == emp.id,
            Attendance.status == "absent",
        ).scalar() or 0

        result.append({
            "employee_id": emp.id,
            "employee_code": emp.employee_code,
            "full_name": emp.full_name,
            "total_attendance": total_attendance,
            "present": present_count,
            "late": late_count,
            "absent": absent_count,
            "monthly_salary": float(emp.monthly_salary or 0),
            "hourly_rate": float(emp.hourly_rate or 0),
        })

    return result