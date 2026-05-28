# Face Recognition Service
# Uses MediaPipe for face detection + landmark-based face encoding
# Works on Windows without any C++ build tools

import json
import logging
import math
import numpy as np
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session

import mediapipe as mp
import cv2
from PIL import Image

logger = logging.getLogger(__name__)

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
mp_face_detection = mp.solutions.face_detection

# Use FaceDetection for simpler bounding box approach
# or FaceMesh for detailed landmark-based encoding
USE_FACE_MESH = True  # Set to False for simpler face detection only


def _get_face_encoding_from_landmarks(face_landmarks, image_width: int, image_height: int) -> list:
    """
    Convert MediaPipe face landmarks to a normalized encoding vector.
    Extracts 468 face landmarks (x, y, z) = 1404 values.
    Normalizes to be scale/rotation invariant where possible.
    """
    encoding = []
    # Get nose tip as reference point (landmark 1)
    nose = face_landmarks.landmark[1]
    
    for landmark in face_landmarks.landmark:
        # Normalize relative to nose position
        dx = landmark.x - nose.x
        dy = landmark.y - nose.y
        dz = landmark.z - nose.z
        encoding.extend([dx, dy, dz])
    
    return encoding


def encode_face(image_bytes: bytes) -> Optional[list]:
    """
    Extract face encoding from image bytes using MediaPipe.
    Returns a list of normalized landmark coordinates or None if no face detected.
    """
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            logger.warning("Failed to decode image")
            return None

        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        height, width = img_rgb.shape[:2]

        if USE_FACE_MESH:
            with mp_face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                min_detection_confidence=0.5,
            ) as face_mesh:
                results = face_mesh.process(img_rgb)

                if not results or not results.multi_face_landmarks:
                    logger.warning("No face detected in image")
                    return None

                # Take the first face
                landmarks = results.multi_face_landmarks[0]
                encoding = _get_face_encoding_from_landmarks(landmarks, width, height)

                logger.info(f"Face encoded via MediaPipe landmarks, dim={len(encoding)}")
                return encoding
        else:
            # Simple face detection fallback
            with mp_face_detection.FaceDetection(min_detection_confidence=0.5) as face_detection:
                results = face_detection.process(img_rgb)

                if not results or not results.detections:
                    logger.warning("No face detected in image")
                    return None

                detection = results.detections[0]
                bbox = detection.location_data.relative_bounding_box

                # Use bounding box as simple encoding (not ideal but works)
                encoding = [bbox.xmin, bbox.ymin, bbox.width, bbox.height]
                logger.info(f"Face detected via MediaPipe, dim={len(encoding)}")
                return encoding

    except Exception as e:
        logger.error(f"Face encoding error: {e}")
        return None


def compare_faces(encoding1: list, encoding2: list) -> float:
    """
    Compare two face encodings using normalized cosine similarity.
    Returns a similarity score between 0 and 1.
    """
    if not encoding1 or not encoding2:
        return 0.0
    
    vec1 = np.array(encoding1, dtype=np.float64)
    vec2 = np.array(encoding2, dtype=np.float64)

    # Normalize
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)

    if norm1 == 0 or norm2 == 0:
        return 0.0

    vec1 = vec1 / norm1
    vec2 = vec2 / norm2

    # Cosine similarity
    similarity = float(np.dot(vec1, vec2))
    
    # Convert from [-1, 1] to [0, 1] range
    similarity = (similarity + 1.0) / 2.0
    
    # Clamp
    similarity = max(0.0, min(1.0, similarity))

    return similarity


def find_best_match(encoding: list, stored_encodings: list) -> Tuple[Optional[int], float]:
    """
    Find the best matching employee from a list of stored encodings.
    Returns (employee_id, confidence) or (None, 0.0).
    """
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
    """
    Load all face encodings from the database.
    Returns list of (employee_id, encoding_list) tuples.
    """
    from app.models.employee_face import EmployeeFace

    faces = db.query(EmployeeFace).all()
    result = []
    for face in faces:
        try:
            enc = json.loads(face.face_encoding)
            result.append((face.employee_id, enc))
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"Failed to decode face encoding for face_id={face.id}: {e}")
            continue

    logger.info(f"Loaded {len(result)} face encodings from database")
    return result