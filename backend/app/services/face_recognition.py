# Face Recognition Service
# Uses DeepFace (Facenet) as primary engine for high accuracy.
# Falls back to MediaPipe landmarks if DeepFace is not available.

import json
import logging
import numpy as np
from typing import Optional, Tuple
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ----- Try DeepFace first (Docker/Linux - high accuracy) -----
DEEPFACE_AVAILABLE = False
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
    logger.info("DeepFace loaded - using Facenet for face recognition")
except ImportError:
    logger.info("DeepFace not available - falling back to MediaPipe")

# ----- Fallback: MediaPipe (Windows local - lower accuracy) -----
MEDIAPIPE_AVAILABLE = False
if not DEEPFACE_AVAILABLE:
    try:
        import mediapipe as mp
        mp_face_mesh = mp.solutions.face_mesh
        MEDIAPIPE_AVAILABLE = True
        logger.info("MediaPipe loaded - using landmark-based face encoding")
    except ImportError:
        logger.warning("No face recognition library available")


# ===================== DEEPFACE METHODS =====================

def encode_face_deepface(image_bytes: bytes) -> Optional[list]:
    """Extract face encoding using DeepFace Facenet (128-dim embedding)."""
    import cv2
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return None
    try:
        result = DeepFace.represent(
            img_path=img,
            model_name="Facenet",
            detector_backend="opencv",
            enforce_detection=True,
            align=True,
        )
        if result and len(result) > 0:
            embedding = result[0]["embedding"]
            logger.info(f"DeepFace encoding: {len(embedding)} dim")
            return embedding
    except ValueError:
        pass  # No face detected
    return None


# ===================== MEDIAPIPE METHODS =====================

def _get_encoding_from_landmarks(face_landmarks) -> list:
    """Convert MediaPipe face landmarks to 1404-dim encoding vector."""
    encoding = []
    nose = face_landmarks.landmark[1]
    for landmark in face_landmarks.landmark:
        encoding.extend([
            landmark.x - nose.x,
            landmark.y - nose.y,
            landmark.z - nose.z,
        ])
    return encoding


def encode_face_mediapipe(image_bytes: bytes) -> Optional[list]:
    """Extract face encoding using MediaPipe FaceMesh landmarks."""
    import cv2
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return None
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    with mp_face_mesh.FaceMesh(
        static_image_mode=True, max_num_faces=1, min_detection_confidence=0.5,
    ) as face_mesh:
        results = face_mesh.process(img_rgb)
        if not results or not results.multi_face_landmarks:
            return None
        encoding = _get_encoding_from_landmarks(results.multi_face_landmarks[0])
        logger.info(f"MediaPipe encoding: {len(encoding)} dim")
        return encoding


# ===================== MAIN ENCODE FUNCTION =====================

def encode_face(image_bytes: bytes) -> Optional[list]:
    """
    Extract face encoding from image bytes.
    Uses DeepFace Facenet on Docker/Linux (high accuracy,
    falls back to MediaPipe landmarks on Windows.
    """
    if DEEPFACE_AVAILABLE:
        enc = encode_face_deepface(image_bytes)
        if enc:
            return enc
        logger.warning("DeepFace detection failed, trying MediaPipe fallback")

    if MEDIAPIPE_AVAILABLE:
        return encode_face_mediapipe(image_bytes)

    return None


# ===================== COMPARISON =====================

def compare_faces(encoding1: list, encoding2: list) -> float:
    """
    Compare two face encodings using cosine similarity.
    Returns similarity between 0 and 1.
    """
    vec1 = np.array(encoding1, dtype=np.float64)
    vec2 = np.array(encoding2, dtype=np.float64)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    vec1 /= norm1
    vec2 /= norm2
    similarity = float(np.dot(vec1, vec2))
    # DeepFace uses [-1,1], MediaPipe uses [-1,1] too
    similarity = (similarity + 1.0) / 2.0
    return max(0.0, min(1.0, similarity))


def find_best_match(encoding: list, stored_encodings: list) -> Tuple[Optional[int], float]:
    """Find the best matching employee from stored encodings."""
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
    """Load all face encodings from database."""
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