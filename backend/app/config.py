from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "SHRUG STAFF"
    VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql://postgres:Faizan1018%40@localhost:5432/shrug_staff"

    # JWT
    SECRET_KEY: str = "shrug-staff-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # Face Recognition
    # FaceNet L2 distance threshold (lower = stricter)
    # ~0.6 = same person, ~1.0+ = different person
    FACE_CONFIDENCE_THRESHOLD: float = 0.65

    # CORS - allow all origins in production (mobile app)
    CORS_ORIGINS: list = ["*"]

    # Upload
    UPLOAD_DIR: str = "uploads/faces"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()