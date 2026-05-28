import logging
import base64
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import RecognizeResponse, EmployeeOut
from app.services.face_recognition import encode_face, find_best_match, load_all_encodings
from app.models.employee import Employee
from app.models.system_log import SystemLog

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Recognition"])


@router.post("/recognize", response_model=RecognizeResponse)
async def recognize_face(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a face image and get the matched employee.
    Server-side face recognition using InsightFace.
    """
    try:
        # Read image bytes
        image_bytes = await file.read()

        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty image data")

        # Encode face
        encoding = encode_face(image_bytes)
        if encoding is None:
            return RecognizeResponse(
                matched=False,
                employee=None,
                confidence=None,
                message="No face detected in the image. Please try again with a clearer photo.",
            )

        # Load all stored encodings and find best match
        stored_encodings = load_all_encodings(db)
        if not stored_encodings:
            return RecognizeResponse(
                matched=False,
                employee=None,
                confidence=None,
                message="No registered faces found in the system.",
            )

        matched_id, confidence = find_best_match(encoding, stored_encodings)

        if matched_id is None:
            # Log unknown face attempt
            log = SystemLog(
                module="recognition",
                action="unknown_face",
                details=f"Unknown face detected, confidence={confidence:.4f} (below threshold)",
            )
            db.add(log)
            db.commit()

            return RecognizeResponse(
                matched=False,
                employee=None,
                confidence=confidence,
                message=f"No matching employee found. Confidence: {confidence:.2f}",
            )

        # Get employee details
        employee = db.query(Employee).filter(Employee.id == matched_id, Employee.active.is_(True)).first()
        if not employee:
            return RecognizeResponse(
                matched=False,
                employee=None,
                confidence=confidence,
                message="Matched employee is not active in the system.",
            )

        # Log successful recognition
        log = SystemLog(
            module="recognition",
            action="face_matched",
            details=f"Employee {employee.employee_code} ({employee.full_name}) matched with confidence={confidence:.4f}",
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