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
    Compare two face descriptors using cosine similarity.
    FaceNet produces non-negative embeddings, so cosine similarity
    naturally ranges [0, 1]. No rescaling needed.
    """
    if not encoding1 or not encoding2:
        return 0.0
    vec1 = np.array(encoding1, dtype=np.float64)
    vec2 = np.array(encoding2, dtype=np.float64)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    if norm1 < 1e-10 or norm2 < 1e-10:
        return 0.0
    similarity = float(np.dot(vec1 / norm1, vec2 / norm2))
    # FaceNet produces values in [0, 1] — clamp to be safe
    return max(0.0, min(1.0, similarity))


def find_best_match(encoding: list, stored_encodings: list) -> Tuple[Optional[int], float]:
    """Find the best matching employee from stored decodings."""
    best_id = None
    best_score = 0.0
    for emp_id, stored_enc in stored_encodings:
        try:
            score = compare_faces(encoding, stored_enc)
            if score > best_score:
                best_score = score
                best_id = emp_id
        except Exception as e:
            logger.warning(f"Error comparing face for employee {emp_id}: {e}")
            continue
    from app.config import settings
    if best_score >= settings.FACE_CONFIDENCE_THRESHOLD:
        return best_id, best_score
    return None, best_score


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