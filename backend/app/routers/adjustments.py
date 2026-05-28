from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.adjustment import Adjustment
from app.models.employee import Employee
from app.models.system_log import SystemLog
from app.schemas import AdjustmentCreate, AdjustmentOut
from app.routers.admin_auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin Adjustments"], dependencies=[Depends(require_admin)])


@router.get("/adjustments", response_model=List[AdjustmentOut])
def list_adjustments(
    employee_id: Optional[int] = None,
    type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """List all fines and bonuses with optional filters."""
    query = db.query(Adjustment)

    if employee_id:
        query = query.filter(Adjustment.employee_id == employee_id)
    if type:
        query = query.filter(Adjustment.type == type)
    if start_date:
        query = query.filter(Adjustment.adjustment_date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(Adjustment.adjustment_date <= date.fromisoformat(end_date))

    records = query.order_by(Adjustment.adjustment_date.desc(), Adjustment.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for r in records:
        emp = db.query(Employee).filter(Employee.id == r.employee_id).first()
        result.append(AdjustmentOut(
            id=r.id, employee_id=r.employee_id, type=r.type, amount=r.amount,
            reason=r.reason, adjustment_date=r.adjustment_date, created_at=r.created_at,
            employee_name=emp.full_name if emp else None,
            employee_code=emp.employee_code if emp else None,
        ))
    return result


@router.post("/adjustments", response_model=AdjustmentOut, status_code=201)
def create_adjustment(data: AdjustmentCreate, db: Session = Depends(get_db)):
    """Create a fine or bonus for an employee."""
    employee = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if data.type not in ("fine", "bonus"):
        raise HTTPException(status_code=400, detail="Type must be 'fine' or 'bonus'")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    adjustment = Adjustment(
        employee_id=data.employee_id,
        type=data.type,
        amount=data.amount,
        reason=data.reason,
        adjustment_date=data.adjustment_date,
    )
    db.add(adjustment)
    db.flush()

    log = SystemLog(
        module="adjustments",
        action="create",
        details=f"{data.type} of {data.amount} PKR for {employee.full_name}: {data.reason}",
    )
    db.add(log)
    db.commit()
    db.refresh(adjustment)

    return AdjustmentOut(
        id=adjustment.id, employee_id=adjustment.employee_id, type=adjustment.type,
        amount=adjustment.amount, reason=adjustment.reason,
        adjustment_date=adjustment.adjustment_date, created_at=adjustment.created_at,
        employee_name=employee.full_name, employee_code=employee.employee_code,
    )


@router.delete("/adjustments/{adjustment_id}", response_model=dict)
def delete_adjustment(adjustment_id: int, db: Session = Depends(get_db)):
    """Delete a fine or bonus."""
    adjustment = db.query(Adjustment).filter(Adjustment.id == adjustment_id).first()
    if not adjustment:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    db.delete(adjustment)
    log = SystemLog(module="adjustments", action="delete", details=f"Deleted adjustment #{adjustment_id}")
    db.add(log)
    db.commit()
    return {"message": "Adjustment deleted"}