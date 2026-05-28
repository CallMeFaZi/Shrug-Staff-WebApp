from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.attendance import Attendance
from app.models.employee import Employee
from app.models.payroll import Payroll
from app.models.system_log import SystemLog
from app.schemas import PayrollOut, PayrollGenerate
from app.routers.admin_auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin Payroll"], dependencies=[Depends(require_admin)])


@router.get("/payroll", response_model=List[PayrollOut])
def list_payroll(
    month: int = None,
    year: int = None,
    employee_id: int = None,
    db: Session = Depends(get_db),
):
    """List payroll records with optional filters."""
    query = db.query(Payroll)

    if month:
        query = query.filter(Payroll.month == month)
    if year:
        query = query.filter(Payroll.year == year)
    if employee_id:
        query = query.filter(Payroll.employee_id == employee_id)

    return query.order_by(Payroll.year.desc(), Payroll.month.desc(), Payroll.employee_id).all()


@router.post("/payroll/generate", response_model=List[PayrollOut])
def generate_payroll(data: PayrollGenerate, db: Session = Depends(get_db)):
    """Generate payroll for all active employees for a given month/year."""
    month, year = data.month, data.year

    active_employees = db.query(Employee).filter(Employee.active.is_(True)).all()
    generated = []

    for emp in active_employees:
        # Check if payroll already exists - UPDATE instead of skip
        existing = db.query(Payroll).filter(
            Payroll.employee_id == emp.id,
            Payroll.month == month,
            Payroll.year == year,
        ).first()

        # Get attendance records for the month
        total_days_in_month = 0
        present_days = 0
        absent_days = 0
        late_days = 0
        unpaid_days = 0
        total_salary = 0
        total_deductions = 0

        import calendar
        last_day = calendar.monthrange(year, month)[1]
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        attendance_records = db.query(Attendance).filter(
            Attendance.employee_id == emp.id,
            Attendance.attendance_date >= start_date,
            Attendance.attendance_date <= end_date,
        ).all()

        for att in attendance_records:
            total_days_in_month += 1
            if att.status == "present":
                present_days += 1
                total_salary += float(att.payment or 0)
            elif att.status == "late":
                late_days += 1
                total_salary += float(att.payment or 0)
                if att.payment and float(att.payment) > 0:
                    pass  # counted with partial pay
            elif att.status in ("absent", "incomplete"):
                absent_days += 1
                unpaid_days += 1

        # Deductions already applied at clock-out time, don't double-count here
        # The late deduction was already subtracted from the daily payment

        final_salary = max(0, total_salary - total_deductions)

        if existing:
            # Update existing record
            existing.total_days = total_days_in_month
            existing.present_days = present_days
            existing.absent_days = absent_days
            existing.late_days = late_days
            existing.unpaid_days = unpaid_days
            existing.total_salary = round(total_salary, 2)
            existing.deductions = round(total_deductions, 2)
            existing.final_salary = round(final_salary, 2)
            generated.append(existing)
        else:
            # Create new record
            payroll = Payroll(
                employee_id=emp.id,
                month=month,
                year=year,
                total_days=total_days_in_month,
                present_days=present_days,
                absent_days=absent_days,
                late_days=late_days,
                unpaid_days=unpaid_days,
                total_salary=round(total_salary, 2),
                deductions=round(total_deductions, 2),
                final_salary=round(final_salary, 2),
            )
            db.add(payroll)
            db.flush()
            generated.append(payroll)

    log = SystemLog(
        module="payroll",
        action="generate",
        details=f"Generated payroll for {len(generated)} employees for {month}/{year}",
    )
    db.add(log)
    db.commit()

    for g in generated:
        db.refresh(g)

    return generated


@router.get("/payroll/summary", response_model=dict)
def payroll_summary(month: int = None, year: int = None, db: Session = Depends(get_db)):
    """Get payroll summary (total paid, total deductions, etc.)."""
    query = db.query(Payroll)

    if month:
        query = query.filter(Payroll.month == month)
    if year:
        query = query.filter(Payroll.year == year)

    records = query.all()

    total_salary = sum(float(r.total_salary or 0) for r in records)
    total_deductions = sum(float(r.deductions or 0) for r in records)
    total_final = sum(float(r.final_salary or 0) for r in records)

    return {
        "total_employees": len(records),
        "total_salary": round(total_salary, 2),
        "total_deductions": round(total_deductions, 2),
        "total_final_salary": round(total_final, 2),
    }