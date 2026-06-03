from decimal import Decimal, ROUND_HALF_UP
from app.models.setting import Setting
from sqlalchemy.orm import Session


def get_settings_dict(db: Session) -> dict:
    """Fetch all settings as a dictionary."""
    settings_rows = db.query(Setting).all()
    return {s.key: s.value for s in settings_rows}


def calculate_hourly_rate(
    monthly_salary: Decimal,
    working_days: int = 26,
    daily_hours: Decimal = Decimal("10.4"),
) -> Decimal:
    """
    Calculate hourly rate from monthly salary.
    Formula: hourly_rate = monthly_salary / (working_days * daily_hours)
    """
    if working_days == 0 or daily_hours == 0:
        return Decimal("0")
    total_hours = Decimal(str(working_days)) * daily_hours
    if total_hours == 0:
        return Decimal("0")
    rate = monthly_salary / total_hours
    return rate.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_daily_pay(
    total_hours_worked: Decimal,
    hourly_rate: Decimal,
) -> Decimal:
    """Calculate pay for a single day: daily_pay = total_hours_worked * hourly_rate"""
    pay = total_hours_worked * hourly_rate
    return pay.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_late_deductions(
    late_minutes: int,
    grace_minutes: int = 15,
    deduction_interval: int = 5,
    deduction_amount: Decimal = Decimal("100"),
) -> tuple:
    """
    Calculate late attendance deductions.

    Rules (as specified):
    - 15 min grace period (clock in 04:00-04:14)
    - At 04:15:00 (15 min late) = first -100 PKR
    - At 04:20:00 (20 min late) = another -100 PKR
    - At 04:25:00 (25 min late) = another -100 PKR
    - At 04:30:00 (30 min late or more) = Absent for whole day

    Returns:
        (deduction_amount, is_absent, status)
    """
    if late_minutes < 30:
        if late_minutes <= grace_minutes:
            deduction = Decimal("0")
        else:
            blocks = ((late_minutes - grace_minutes) // deduction_interval) + 1
            deduction = blocks * deduction_amount
        return deduction, False, "late"
    else:
        return Decimal("0"), True, "absent"