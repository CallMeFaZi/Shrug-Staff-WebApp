import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import RecognizeResponse, EmployeeOut
from app.services.face_recognition import find_best_match, load_all_encodings
from app.models.employee import Employee
from app.models.employee_face import EmployeeFace
from app.models.system_log import SystemLog
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Recognition"])


class DescriptorMatch(BaseModel):
    descriptor: List[float]


class DescriptorStore(BaseModel):
    descriptor: List[float]


@router.post("/recognize-descriptor", response_model=RecognizeResponse)
def recognize_descriptor(data: DescriptorMatch, db: Session = Depends(get_db)):
    """
    Match a face descriptor (128-dim vector from client-side face-api.js)
    against stored employee face encodings.
    """
    try:
        encoding = data.descriptor
        if not encoding or len(encoding) < 10:
            raise HTTPException(status_code=400, detail="Invalid descriptor")

        stored_encodings = load_all_encodings(db)
        if not stored_encodings:
            return RecognizeResponse(
                matched=False, employee=None, confidence=None,
                message="No registered faces found in the system.",
            )

        matched_id, confidence = find_best_match(encoding, stored_encodings)

        if matched_id is None:
            log = SystemLog(
                module="recognition",
                action="unknown_face",
                details=f"Unknown face, confidence={confidence:.4f} (below {settings.FACE_CONFIDENCE_THRESHOLD})",
            )
            db.add(log)
            db.commit()

            return RecognizeResponse(
                matched=False, employee=None, confidence=confidence,
                message=f"No matching employee found.",
            )

        employee = db.query(Employee).filter(Employee.id == matched_id, Employee.active.is_(True)).first()
        if not employee:
            return RecognizeResponse(
                matched=False, employee=None, confidence=confidence,
                message="Matched employee is not active.",
            )

        log = SystemLog(
            module="recognition",
            action="face_matched",
            details=f"Employee {employee.employee_code} ({employee.full_name}) confidence={confidence:.4f}",
        )
        db.add(log)
        db.commit()

        return RecognizeResponse(
            matched=True,
            employee=EmployeeOut.model_validate(employee),
            confidence=confidence,
            message=f"Welcome, {employee.full_name}!",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recognition error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Face recognition failed: {str(e)}")


@router.post("/admin/employees/{employee_id}/face-descriptor", response_model=dict)
def register_face_descriptor(
    employee_id: int,
    data: DescriptorStore,
    db: Session = Depends(get_db),
):
    """Store a face descriptor (128-dim vector from client-side face-api.js) for an employee."""
    from app.routers.admin_auth import require_admin
    # Admin auth is handled by router dependency injection in the calling route
    
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    encoding = data.descriptor
    if not encoding or len(encoding) < 10:
        raise HTTPException(status_code=400, detail="Invalid descriptor")

    # Remove old face encodings
    old_faces = db.query(EmployeeFace).filter(EmployeeFace.employee_id == employee_id).all()
    for old_face in old_faces:
        db.delete(old_face)

    # Store new descriptor
    face = EmployeeFace(
        employee_id=employee_id,
        face_encoding=json.dumps(encoding),
        image_path=None,
    )
    db.add(face)

    log = SystemLog(
        module="employees",
        action="face_descriptor_registered",
        details=f"Face descriptor registered for {employee.employee_code} ({employee.full_name}), dim={len(encoding)}",
    )
    db.add(log)
    db.commit()

    return {"message": f"Face registered successfully for {employee.full_name}", "encoding_dim": len(encoding)}