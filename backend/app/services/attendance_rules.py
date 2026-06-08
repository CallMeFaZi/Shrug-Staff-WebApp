from datetime import datetime, date, timedelta, time, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc

from app.models.attendance import Attendance
from app.models.attendance_log import AttendanceLog
from app.models.shift import Shift
from app.models.employee import Employee
from app.models.setting import Setting
from app.services.salary_calculator import calculate_daily_pay, calculate_late_deductions


PKT = timezone(timedelta(hours=5))

def now_pkt() -> datetime:
    """Return current Pakistan Standard Time (PKT = UTC+5)."""
    return datetime.now(PKT)


def get_setting(db: Session, key: str, default: str = "") -> str:
    setting = db.query(Setting).filter(Setting.key == key).first()
    return setting.value if setting else default


def clock_in_employee(
    db: Session,
    employee_id: int,
    clock_in_time: datetime,
    reason: str = None,
) -> Attendance:
    """
    Record clock-in for an employee.
    Applies late attendance rules.
    """
    today = clock_in_time.date()

    # Check for duplicate attendance
    existing = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.attendance_date == today,
    ).first()

    if existing:
        raise ValueError("Attendance already recorded for today")

    # Get employee shift
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise ValueError("Employee not found")

    shift = db.query(Shift).filter(Shift.id == employee.shift_id).first()
    if not shift:
        raise ValueError("No shift assigned.")

    # Default status
    status = "present"
    deduction = Decimal("0")
    late_minutes = None
    late_deduction = Decimal("0")
    reason = ""

    # Convert clock_in_time to naive datetime (assuming PKT) for shift comparison
    clock_local = clock_in_time.replace(tzinfo=None)
    shift_start = shift.start_time
    shift_end = shift.end_time

    # Combine today's date with shift times
    shift_start_dt = datetime.combine(today, shift_start)
    shift_end_dt = datetime.combine(today, shift_end)
    # Handle overnight shift (if shift ends after midnight)
    if shift_end < shift_start:
        shift_end_dt += timedelta(days=1)

    # Calculate shift duration in minutes
    shift_duration_minutes = (shift_end_dt - shift_start_dt).total_seconds() / 60

    # Calculate elapsed minutes from shift start to clock-in time
    elapsed_minutes = (clock_local - shift_start_dt).total_seconds() / 60

    # Shift constraint: employee can only clock in during assigned shift hours
    # (We assume the shift is valid and clock_in_time is within the shift calendar day)
    # If clock-in time is before shift start, it's early (allowed).
    # If clock-in time is after shift end, it's still during shift? Actually, the shift ends at shift_end_dt.
    # But the business rule says: employees can only clock in during their assigned shift hours.
    # We'll allow clock-in up to shift end? Actually, the mid-shift cutoff is 50% of shift duration.
    # We'll check the mid-shift cutoff first.

    # Mid-Shift Cutoff: if clock-in after 50% of shift duration, error
    if elapsed_minutes > (shift_duration_minutes / 2):
        raise ValueError("Too many hours passed, can't clock in now.")

    # Grace period and late penalties
    if clock_local <= shift_start_dt:
        # Early or on time
        status = "present"
        late_minutes = Decimal("0")
    else:
        late_minutes_float = (clock_local - shift_start_dt).total_seconds() / 60
        # Convert to Decimal for storage and reason (three decimal places)
        late_minutes = Decimal(str(late_minutes_float)).quantize(Decimal("0.001"))
        # Calculate late deductions and status
        deduction, is_absent, status = calculate_late_deductions(late_minutes)
        late_deduction = deduction
        # Set reason
        if is_absent:
            reason = "30+ Mins Late"
        else:
            # Format late_minutes for display: show at most one decimal place, remove trailing zeros
            lm_display = late_minutes.quantize(Decimal("0.1"))
            if lm_display == lm_display.to_integral_value():
                reason = f"{lm_display:.0f} Mins late"
            else:
                reason = f"{lm_display:.1f} Mins late"

    # Get hourly rate
    hourly_rate = employee.hourly_rate or Decimal("0")

    attendance = Attendance(
        employee_id=employee_id,
        attendance_date=today,
        clock_in=clock_in_time,
        status=status,
        payment=Decimal("0"),
        reason=reason or status,
        late_minutes=late_minutes,  # Store exact value (can be fractional)
        late_deduction=late_deduction,
    )

    db.add(attendance)
    db.flush()

    # Log
    log = AttendanceLog(
        employee_id=employee_id,
        action="clock_in",
        details=f"Clocked in at {clock_in_time.strftime('%H:%M:%S')}. Status: {status}",
    )
    db.add(log)

    return attendance


def clock_out_employee(
    db: Session,
    employee_id: int,
    clock_out_time: datetime,
) -> Attendance:
    """
    Record clock-out for an employee.
    Calculates total hours and daily pay.
    Supports overnight shifts (clock-in yesterday, clock-out today).
    Rounds clock-out time to shift end time if within 10 minutes.
    """
    today = clock_out_time.date()

    # First try: find attendance record for today
    attendance = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.attendance_date == today,
    ).first()

    # Second try: if no record today, check yesterday (overnight shift)
    if not attendance:
        from datetime import timedelta
        yesterday = today - timedelta(days=1)
        attendance = db.query(Attendance).filter(
            Attendance.employee_id == employee_id,
            Attendance.attendance_date == yesterday,
            Attendance.clock_out.is_(None),  # hasn't clocked out yet
        ).first()

    if not attendance:
        raise ValueError("No clock-in record found. Please clock in first.")

    if attendance.clock_out:
        raise ValueError("Already clocked out today")

    # Get employee shift for rounding logic
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    shift = None
    if employee:
        shift = db.query(Shift).filter(Shift.id == employee.shift_id).first()

    # Apply clock-out time normalization: adjust to shift end if clock-out is 
    # 10 minutes before shift end or any time after shift end
    final_clock_out_time = clock_out_time
    if shift:
        # Compute shift start and end datetimes based on the clock-in date
        shift_start_date = attendance.clock_in.date()
        shift_start_dt = datetime.combine(shift_start_date, shift.start_time)
        shift_end_dt = datetime.combine(shift_start_date, shift.end_time)
        # Handle overnight shift
        if shift.end_time < shift.start_time:
            shift_end_dt += timedelta(days=1)
        # Make shift_end_dt timezone-aware to match clock_out_time
        if shift_end_dt.tzinfo is None:
            shift_end_dt = shift_end_dt.replace(tzinfo=clock_out_time.tzinfo)
        
        # Calculate the earliest time to adjust to shift end: 10 minutes before shift end
        earliest_adjustment = shift_end_dt - timedelta(minutes=10)
        
        # If clock-out time is at or after earliest_adjustment, adjust to shift end
        if clock_out_time >= earliest_adjustment:
            final_clock_out_time = shift_end_dt

    attendance.clock_out = final_clock_out_time

    # Calculate total hours (using potentially rounded clock-out time)
    delta = attendance.clock_out - attendance.clock_in
    total_hours = Decimal(str(delta.total_seconds() / 3600)).quantize(Decimal("0.01"))
    attendance.total_hours = total_hours

    # Calculate payment
    hourly_rate = employee.hourly_rate or Decimal("0")
    daily_pay = calculate_daily_pay(total_hours, hourly_rate)

    # Apply late deduction if any
    # For absent employees (30+ mins late), payment should be 0 regardless of hours worked
    if attendance.status == "absent":
        daily_pay = Decimal("0")
    else:
        daily_pay = max(Decimal("0"), daily_pay - attendance.late_deduction)

    attendance.payment = daily_pay

    # Log
    log = AttendanceLog(
        employee_id=employee_id,
        action="clock_out",
        details=f"Clocked out at {attendance.clock_out.strftime('%H:%M:%S')}. Hours: {total_hours}, Pay: {daily_pay}",
    )
    db.add(log)

    return attendance


def process_end_of_day(db: Session, date_target: date = None):
    """
    Process end-of-day rules:
    - Mark incomplete shifts (missing clock-out) as incomplete with 0 payment
    """
    if date_target is None:
        date_target = date.today()

    incomplete_records = db.query(Attendance).filter(
        Attendance.attendance_date == date_target,
        Attendance.clock_out.is_(None),
        Attendance.status != "absent",
    ).all()

    for record in incomplete_records:
        record.status = "incomplete"
        record.payment = Decimal("0")
        record.reason = "Missing clock-out"

        log = AttendanceLog(
            employee_id=record.employee_id,
            action="system_correction",
            details=f"Marked as incomplete - missing clock-out on {date_target}",
        )
        db.add(log)


def mark_absent_employees(db: Session, date_target: date = None):
    """
    Mark employees with no attendance record as absent.
    """
    if date_target is None:
        date_target = date.today()

    active_employees = db.query(Employee).filter(Employee.active.is_(True)).all()

    for emp in active_employees:
        existing = db.query(Attendance).filter(
            Attendance.employee_id == emp.id,
            Attendance.attendance_date == date_target,
        ).first()

        if not existing:
            attendance = Attendance(
                employee_id=emp.id,
                attendance_date=date_target,
                status="absent",
                payment=Decimal("0"),
                reason="No clock-in recorded",
            )
            db.add(attendance)

            log = AttendanceLog(
                employee_id=emp.id,
                action="system_correction",
                details=f"Marked as absent - no clock-in on {date_target}",
            )
            db.add(log)