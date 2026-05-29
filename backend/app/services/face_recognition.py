# Face Recognition Service
# Now simplified: client-side does face detection + encoding with face-api.js
# Backend only stores/compares 128-dim descriptors and finds best matches

import json
import logging
import numpy as np
from typing import Optional, Tuple
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def compare_faces(encoding1: list, encoding2: list) -> float:
    """
    Compare two face descriptors using L2 Euclidean distance.
    Returns the raw distance (0 = identical, higher = different).
    face-api.js FaceNet uses a threshold of ~0.6 for same person.
    """
    if not encoding1 or not encoding2:
        return 999.0  # max distance (no match)
    
    # CRITICAL: Reject dimension mismatch
    if len(encoding1) != len(encoding2):
        logger.warning(f"Dimension mismatch: {len(encoding1)} vs {len(encoding2)}")
        return 999.0
    
    vec1 = np.array(encoding1, dtype=np.float64)
    vec2 = np.array(encoding2, dtype=np.float64)
    distance = float(np.linalg.norm(vec1 - vec2))
    return distance


def find_best_match(encoding: list, stored_encodings: list) -> Tuple[Optional[int], float]:
    """
    Find the best matching employee from stored encodings.
    Uses L2 distance: lower = better match.
    """
    best_id = None
    best_distance = 999.0
    for emp_id, stored_enc in stored_encodings:
        try:
            distance = compare_faces(encoding, stored_enc)
            if distance < best_distance:
                best_distance = distance
                best_id = emp_id
        except Exception as e:
            logger.warning(f"Error comparing face for employee {emp_id}: {e}")
            continue
    from app.config import settings
    if best_distance <= settings.FACE_CONFIDENCE_THRESHOLD:
        return best_id, best_distance
    return None, best_distance


def load_all_encodings(db: Session) -> list:
    """Load all face descriptors from database."""
    from app.models.employee_face import EmployeeFace
    faces = db.query(EmployeeFace).all()
    result = []
    for face in faces:
        try:
            enc = json.loads(face.face_encoding)
            result.append((face.employee_id, enc))
        except (json.JSONDecodeError, TypeError):
            continue
    logger.info(f"Loaded {len(result)} face encodings")
    return result