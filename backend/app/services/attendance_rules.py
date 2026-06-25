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


def _adjust_clock_in_and_calculate_late_fields(db: Session, employee_id: int, clock_in_time: datetime, attendance_date: date):
    """
    Adjust clock-in time if within grace period and calculate late-related fields.
    Expects clock_in_time to be timezone-aware (in PKT).
    Returns: (adjusted_clock_in, status, late_minutes, late_deduction, reason)
    where adjusted_clock_in is timezone-aware (in PKT).
    """
    # Get employee and shift
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise ValueError("Employee not found")

    shift = db.query(Shift).filter(Shift.id == employee.shift_id).first()
    if not shift:
        raise ValueError("No shift assigned.")

    # Ensure clock_in_time is in PKT timezone
    if clock_in_time.tzinfo is None:
        # If naive, assume it's PKT (should not happen in normal flow)
        clock_in_time = clock_in_time.replace(tzinfo=PKT)
    else:
        clock_in_time = clock_in_time.astimezone(PKT)
    
    # Get naive PKT time for calculations
    clock_local_naive = clock_in_time.replace(tzinfo=None)
    shift_start = shift.start_time
    shift_end = shift.end_time

    # Combine attendance_date with shift times (naive PKT)
    shift_start_dt = datetime.combine(attendance_date, shift_start)
    shift_end_dt = datetime.combine(attendance_date, shift_end)
    # Handle overnight shift (if shift ends after midnight)
    if shift_end < shift_start:
        shift_end_dt += timedelta(days=1)

    # Calculate shift duration in minutes (for mid-shift cutoff)
    shift_duration_minutes = (shift_end_dt - shift_start_dt).total_seconds() / 60

    # Calculate elapsed minutes from shift start to clock-in time (using naive PKT)
    elapsed_minutes = (clock_local_naive - shift_start_dt).total_seconds() / 60

    # Mid-Shift Cutoff: if clock-in after 50% of shift duration, error
    if elapsed_minutes > (shift_duration_minutes / 2):
        raise ValueError("Too many hours passed, can't clock in now.")

    # Determine if we are in the grace period for adjustment: [shift_start_dt, shift_start_dt+15 minutes)
    if clock_local_naive < shift_start_dt:
        # Early: do not adjust clock-in time
        adjusted_clock_in_naive = clock_local_naive
        status = "present"
        late_minutes = Decimal("0")
        late_deduction = Decimal("0")
        reason = ""
    elif clock_local_naive < shift_start_dt + timedelta(minutes=15):
        # In the grace period: adjust to shift start time
        adjusted_clock_in_naive = shift_start_dt
        status = "present"
        late_minutes = Decimal("0")
        late_deduction = Decimal("0")
        reason = ""
    else:
        # Late by 15 minutes or more: do not adjust clock-in time
        adjusted_clock_in_naive = clock_local_naive
        late_minutes_float = elapsed_minutes   # because elapsed_minutes is (clock_local_naive - shift_start_dt) in minutes
        late_minutes = Decimal(str(late_minutes_float)).quantize(Decimal("0.001"))
        deduction, is_absent, status = calculate_late_deductions(late_minutes)
        late_deduction = deduction
        if is_absent:
            reason = "30+ Mins Late"
        else:
            lm_display = late_minutes.quantize(Decimal("0.1"))
            if lm_display == lm_display.to_integral_value():
                reason = f"{lm_display:.0f} Mins late"
            else:
                reason = f"{lm_display:.1f} Mins late"

    # Convert adjusted clock-in time back to timezone-aware PKT for storage
    adjusted_clock_in = adjusted_clock_in_naive.replace(tzinfo=PKT)

    return adjusted_clock_in, status, late_minutes, late_deduction, reason


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

    # Get employee to check active status
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise ValueError("Employee not found")
    if not employee.active:
        raise ValueError("Employee is inactive")

    # Use helper to adjust clock-in time and calculate late fields
    adjusted_clock_in, status, late_minutes, late_deduction, reason = _adjust_clock_in_and_calculate_late_fields(
        db, employee_id, clock_in_time, today
    )

    # Get hourly rate
    hourly_rate = employee.hourly_rate or Decimal("0")

    attendance = Attendance(
        employee_id=employee_id,
        attendance_date=today,
        clock_in=adjusted_clock_in.astimezone(timezone.utc),
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


def _calculate_hours_and_payment(db: Session, attendance: Attendance):
    """
    Calculate total hours and payment for an attendance record.
    Returns: (total_hours, payment)
    """
    # Get employee
    employee = db.query(Employee).filter(Employee.id == attendance.employee_id).first()
    if not employee:
        raise ValueError("Employee not found")

    # Calculate total hours (using potentially rounded clock-out time)
    if attendance.clock_in is None or attendance.clock_out is None:
        # Cannot calculate hours without both times
        return Decimal("0"), Decimal("0")

    delta = attendance.clock_out - attendance.clock_in
    total_hours = Decimal(str(delta.total_seconds() / 3600)).quantize(Decimal("0.01"))

    # Calculate payment
    hourly_rate = employee.hourly_rate or Decimal("0")
    daily_pay = calculate_daily_pay(total_hours, hourly_rate)

    # Apply late deduction if any
    # For absent employees (30+ mins late), payment should be 0 regardless of hours worked
    if attendance.status == "absent":
        daily_pay = Decimal("0")
    else:
        daily_pay = max(Decimal("0"), daily_pay - attendance.late_deduction)

    return total_hours, daily_pay


def recalculate_attendance(db: Session, attendance: Attendance) -> Attendance:
    """
    Recalculate an attendance record based on its clock_in and clock_out times.
    Updates the record's status, late_minutes, late_deduction, reason, total_hours, and payment.
    """
    if attendance.clock_in is not None:
        # Recalculate late-related fields and adjust clock-in time if in grace period
        adjusted_clock_in, status, late_minutes, late_deduction, reason = _adjust_clock_in_and_calculate_late_fields(
            db, attendance.employee_id, attendance.clock_in, attendance.attendance_date
        )
        attendance.clock_in = adjusted_clock_in.astimezone(timezone.utc)
        attendance.status = status
        attendance.late_minutes = late_minutes
        attendance.late_deduction = late_deduction
        attendance.reason = reason

    if attendance.clock_in is not None and attendance.clock_out is not None:
        # Recalculate total hours and payment
        total_hours, payment = _calculate_hours_and_payment(db, attendance)
        attendance.total_hours = total_hours
        attendance.payment = payment
    else:
        # If we don't have both times, we cannot calculate hours and payment from clock-in/out.
        # However, if the status is absent, payment should be 0.
        if attendance.status == "absent":
            attendance.payment = Decimal("0")
        # If we only have clock_out and not clock_in, we cannot calculate hours.
        pass

    # Ensure payment is 0 if absent (overwrite)
    if attendance.status == "absent":
        attendance.payment = Decimal("0")

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
    Expects clock_out_time to be timezone-aware (in PKT).
    """
    today = clock_out_time.date()

    # First try: find attendance record for today
    attendance = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.attendance_date == today,
    ).first()

    # Second try: if no record today, check yesterday (overnight shift)
    if not attendance:
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
    if not employee:
        raise ValueError("Employee not found")
    if not employee.active:
        raise ValueError("Employee is inactive")
    shift = None
    if employee:
        shift = db.query(Shift).filter(Shift.id == employee.shift_id).first()

    # Apply clock-out time normalization: adjust to shift end if clock-out is 
    # 10 minutes before shift end or any time after shift end
    final_clock_out_time = clock_out_time
    if shift:
        # Ensure clock_out_time is in PKT timezone
        if clock_out_time.tzinfo is None:
            # If naive, assume it's PKT (should not happen in normal flow)
            clock_out_time = clock_out_time.replace(tzinfo=PKT)
        else:
            clock_out_time = clock_out_time.astimezone(PKT)
        
        # Compute shift start and end datetimes based on the clock-in date
        # attendance.clock_in is timezone-aware PKT (after our fix)
        clock_in_pkt = attendance.clock_in  # timezone-aware PKT
        shift_start_date = clock_in_pkt.date()
        shift_start_dt = datetime.combine(shift_start_date, shift.start_time)
        shift_end_dt = datetime.combine(shift_start_date, shift.end_time)
        # Handle overnight shift
        if shift.end_time < shift.start_time:
            shift_end_dt += timedelta(days=1)
        # Make shift_start_dt and shift_end_dt timezone-aware in PKT
        shift_start_dt = shift_start_dt.replace(tzinfo=PKT)
        shift_end_dt = shift_end_dt.replace(tzinfo=PKT)
        
        # Calculate the earliest time to adjust to shift end: 10 minutes before shift end
        earliest_adjustment = shift_end_dt - timedelta(minutes=10)
        
        # If clock-out time is at or after earliest_adjustment, adjust to shift end
        if clock_out_time >= earliest_adjustment:
            final_clock_out_time = shift_end_dt

    attendance.clock_out = final_clock_out_time.astimezone(timezone.utc)
    # Recalculate hours and payment after setting clock_out
    attendance = recalculate_attendance(db, attendance)
    log = AttendanceLog(
        employee_id=employee_id,
        action="clock_out",
        details=f"Clocked out at {final_clock_out_time.strftime('%H:%M:%S')}. Hours: {attendance.total_hours}, Pay: {attendance.payment}",
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