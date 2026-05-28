from datetime import date, datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.attendance import Attendance
from app.models.employee import Employee
from app.models.payroll import Payroll
from app.schemas import DashboardData, AttendanceOut
from app.routers.admin_auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin Dashboard"], dependencies=[Depends(require_admin)])


@router.get("/dashboard", response_model=DashboardData)
def get_dashboard(db: Session = Depends(get_db)):
    """Get dashboard widget data."""
    today = date.today()

    # Total active employees
    total_employees = db.query(func.count(Employee.id)).filter(Employee.active.is_(True)).scalar() or 0

    # Today's attendance counts
    today_records = db.query(Attendance).filter(
        Attendance.attendance_date == today,
    ).all()

    present_today = sum(1 for r in today_records if r.status == "present")
    absent_today = sum(1 for r in today_records if r.status == "absent")
    late_today = sum(1 for r in today_records if r.status == "late")
    incomplete_today = sum(1 for r in today_records if r.status == "incomplete")

    # Payroll total for current month
    current_month = today.month
    current_year = today.year

    payroll_total = db.query(func.sum(Payroll.final_salary)).filter(
        Payroll.month == current_month,
        Payroll.year == current_year,
    ).scalar() or 0

    # Recent attendance records with employee names
    recent = db.query(Attendance).order_by(
        Attendance.created_at.desc(),
    ).limit(10).all()

    recent_attendance = []
    for r in recent:
        emp = db.query(Employee).filter(Employee.id == r.employee_id).first()
        recent_attendance.append(
            AttendanceOut(
                id=r.id,
                employee_id=r.employee_id,
                attendance_date=r.attendance_date,
                clock_in=r.clock_in,
                clock_out=r.clock_out,
                total_hours=r.total_hours or 0,
                status=r.status,
                payment=r.payment or 0,
                reason=r.reason,
                created_at=r.created_at,
                employee_name=emp.full_name if emp else None,
                employee_code=emp.employee_code if emp else None,
            )
        )

    return DashboardData(
        total_employees=total_employees,
        present_today=present_today,
        absent_today=absent_today,
        late_today=late_today,
        incomplete_today=incomplete_today,
        payroll_total=payroll_total,
        recent_attendance=recent_attendance,
    )