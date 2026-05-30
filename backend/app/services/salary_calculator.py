from decimal import Decimal, ROUND_HALF_UP


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
    # If still within grace period
    if late_minutes < grace_minutes:
        return Decimal("0"), False, "present"

    # 30+ min late = absent for the day
    if late_minutes >= 30:
        return Decimal("0"), True, "absent"

    # Calculate blocks past grace:
    # Each 5-min segment after grace = 1 block
    # 15-19 min = 1 block, 20-24 = 2 blocks, 25-29 = 3 blocks
    blocks = ((late_minutes - grace_minutes) // deduction_interval) + 1
    total_deduction = Decimal(str(blocks)) * deduction_amount

    return total_deduction, False, "late"