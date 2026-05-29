import json
import os
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.employee import Employee
from app.models.employee_face import EmployeeFace
from app.models.shift import Shift
from app.models.system_log import SystemLog
from app.schemas import EmployeeCreate, EmployeeUpdate, EmployeeOut, ShiftCreate, ShiftOut
from app.routers.admin_auth import require_admin
from app.services.salary_calculator import calculate_hourly_rate
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["Admin Employees"], dependencies=[Depends(require_admin)])


@router.get("/employees", response_model=List[EmployeeOut])
def list_employees(
    active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all employees, with optional filters."""
    query = db.query(Employee)

    if active is not None:
        query = query.filter(Employee.active.is_(active))

    if search:
        query = query.filter(
            Employee.full_name.ilike(f"%{search}%") |
            Employee.employee_code.ilike(f"%{search}%")
        )

    employees = query.order_by(Employee.full_name).all()
    return employees


@router.post("/employees", response_model=EmployeeOut, status_code=201)
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db)):
    """Create a new employee."""
    existing = db.query(Employee).filter(Employee.employee_code == data.employee_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee code already exists")

    # Auto-calculate hourly rate if not provided
    hourly_rate = data.hourly_rate
    if hourly_rate == 0 and data.monthly_salary > 0:
        hourly_rate = calculate_hourly_rate(data.monthly_salary)

    employee = Employee(
        employee_code=data.employee_code,
        full_name=data.full_name,
        phone=data.phone,
        monthly_salary=data.monthly_salary,
        hourly_rate=hourly_rate,
        shift_id=data.shift_id,
    )

    db.add(employee)
    db.flush()

    log = SystemLog(
        module="employees",
        action="create",
        details=f"Created employee {employee.employee_code} - {employee.full_name}",
    )
    db.add(log)
    db.commit()
    db.refresh(employee)

    return employee


@router.get("/employees/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    """Get a single employee by ID."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.put("/employees/{employee_id}", response_model=EmployeeOut)
def update_employee(employee_id: int, data: EmployeeUpdate, db: Session = Depends(get_db)):
    """Update an existing employee."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(employee, key, value)

    # Recalculate hourly rate if salary changed
    if "monthly_salary" in update_data and update_data["monthly_salary"] > 0:
        if not update_data.get("hourly_rate") or update_data.get("hourly_rate", 0) == 0:
            employee.hourly_rate = calculate_hourly_rate(employee.monthly_salary)

    log = SystemLog(
        module="employees",
        action="update",
        details=f"Updated employee {employee.employee_code}: {', '.join(update_data.keys())}",
    )
    db.add(log)
    db.commit()
    db.refresh(employee)

    return employee


@router.delete("/employees/{employee_id}", response_model=dict)
def deactivate_employee(employee_id: int, db: Session = Depends(get_db)):
    """Deactivate an employee (soft delete)."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee.active = False

    log = SystemLog(
        module="employees",
        action="deactivate",
        details=f"Deactivated employee {employee.employee_code} - {employee.full_name}",
    )
    db.add(log)
    db.commit()

    return {"message": f"Employee {employee.employee_code} deactivated successfully"}


@router.post("/employees/{employee_id}/face", response_model=dict)
async def register_face(
    employee_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Register a face encoding for an employee."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    try:
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty image")

        # Encode face
        encoding = encode_face(image_bytes)
        if encoding is None:
            raise HTTPException(status_code=400, detail="No face detected in the image. Please try again with a clearer photo.")

        # Save image to disk
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        image_filename = f"emp_{employee_id}_{len(employee.faces)}.jpg"
        image_path = os.path.join(settings.UPLOAD_DIR, image_filename)
        with open(image_path, "wb") as f:
            f.write(image_bytes)

        # Remove old face encodings if updating
        old_faces = db.query(EmployeeFace).filter(EmployeeFace.employee_id == employee_id).all()
        for old_face in old_faces:
            db.delete(old_face)

        # Store new encoding
        face = EmployeeFace(
            employee_id=employee_id,
            face_encoding=json.dumps(encoding),
            image_path=image_path,
        )
        db.add(face)

        log = SystemLog(
            module="employees",
            action="face_registered",
            details=f"Face registered for employee {employee.employee_code} ({employee.full_name})",
        )
        db.add(log)
        db.commit()

        return {"message": f"Face registered successfully for {employee.full_name}", "encoding_dim": len(encoding)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face registration error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to register face: {str(e)}")


# ============== Shift endpoints ==============


@router.get("/shifts", response_model=List[ShiftOut])
def list_shifts(db: Session = Depends(get_db)):
    """List all shifts."""
    return db.query(Shift).order_by(Shift.shift_name).all()


@router.post("/shifts", response_model=ShiftOut, status_code=201)
def create_shift(data: ShiftCreate, db: Session = Depends(get_db)):
    """Create a new shift."""
    shift = Shift(**data.model_dump())
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift


@router.put("/shifts/{shift_id}", response_model=ShiftOut)
def update_shift(shift_id: int, data: ShiftCreate, db: Session = Depends(get_db)):
    """Update a shift."""
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    for key, value in data.model_dump().items():
        setattr(shift, key, value)
    db.commit()
    db.refresh(shift)
    return shift


@router.delete("/shifts/{shift_id}", response_model=dict)
def delete_shift(shift_id: int, db: Session = Depends(get_db)):
    """Delete a shift."""
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    db.delete(shift)
    db.commit()
    return {"message": "Shift deleted successfully"}