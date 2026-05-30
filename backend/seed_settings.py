"""Seed default settings into the database.
Creates tables if they don't exist, then seeds default settings.
"""
from app.database import engine, Base, SessionLocal
from app.models.setting import Setting
from app.models import *  # ensure all models are imported

DEFAULTS = {
    "admin_pin": "969600",
    "grace_minutes": "15",
    "late_deduction_interval": "5",
    "late_deduction_amount": "100",
    "late_max_minutes": "30",
    "working_days_per_month": "26",
    "daily_working_hours": "10.4",
    "face_confidence_threshold": "0.65",
    "geo_lat": "31.550258",
    "geo_lng": "74.284766",
    "geo_radius": "50",
}


def seed():
    try:
        # Create all tables if they don't exist
        Base.metadata.create_all(bind=engine)
        print("[OK] Tables created/verified")

        db = SessionLocal()
        count = 0
        for key, value in DEFAULTS.items():
            existing = db.query(Setting).filter(Setting.key == key).first()
            if not existing:
                db.add(Setting(key=key, value=value))
                count += 1
        db.commit()
        db.close()
        print(f"[OK] Settings seeded ({count} new entries)")
    except Exception as e:
        print(f"[INFO] Could not seed settings: {e}")
        print("[INFO] Backend will create tables and seed on first startup")


if __name__ == "__main__":
    seed()