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


def calculate_late_deductions(late_minutes) -> tuple:
    """
    Calculate late attendance deductions as per business rules.

    Rules:
    - 0-15 mins late: Present, deduction 0
    - 15-20 mins late: Late, deduction 100
    - 20-25 mins late: Late, deduction 200
    - 25-30 mins late: Late, deduction 300
    - 30+ mins late: Absent, deduction 0 (but status absent, and pay 0 elsewhere)

    Returns:
        (deduction: Decimal, is_absent: bool, status: str)
    """
    # Convert to float if it's Decimal for comparison
    lm = float(late_minutes)

    if lm < 15:
        return Decimal("0"), False, "present"
    elif lm < 20:
        return Decimal("100"), False, "late"
    elif lm < 25:
        return Decimal("200"), False, "late"
    elif lm < 30:
        return Decimal("300"), False, "late"
    else:
        return Decimal("0"), True, "absent"