from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.setting import Setting
from app.models.system_log import SystemLog
from app.schemas import SettingUpdate, SettingOut

router = APIRouter(prefix="/api", tags=["Settings"])
admin_router = APIRouter(prefix="/api/admin", tags=["Admin Settings"])

# ============== PUBLIC ENDPOINTS ==============

@router.get("/geo-settings", response_model=dict)
def get_geo_settings(db: Session = Depends(get_db)):
    """Public endpoint: get geo-fencing settings (no auth required)."""
    geo_keys = ["geo_lat", "geo_lng", "geo_radius"]
    result = {}
    for key in geo_keys:
        setting = db.query(Setting).filter(Setting.key == key).first()
        result[key] = setting.value if setting else ""
    return result


# ============== ADMIN ENDPOINTS ==============


@admin_router.get("/settings", response_model=List[SettingOut])
def get_settings(db: Session = Depends(get_db)):
    """Get all system settings."""
    settings = db.query(Setting).order_by(Setting.key).all()
    return settings


@admin_router.put("/settings", response_model=dict)
def update_settings(data: SettingUpdate, db: Session = Depends(get_db)):
    """Update system settings."""
    updated = []
    for item in data.items:
        key = item.get("key")
        value = item.get("value")

        if not key or value is None:
            continue

        setting = db.query(Setting).filter(Setting.key == key).first()
        if setting:
            setting.value = str(value)
        else:
            setting = Setting(key=key, value=str(value))
            db.add(setting)

        updated.append(key)

    log = SystemLog(
        module="settings",
        action="update",
        details=f"Updated settings: {', '.join(updated)}",
    )
    db.add(log)
    db.commit()

    return {"message": "Settings updated successfully", "updated": updated}


@admin_router.post("/settings/seed", response_model=dict)
def seed_default_settings(db: Session = Depends(get_db)):
    """Seed default settings if they don't exist."""
    defaults = {
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

    created = []
    for key, value in defaults.items():
        existing = db.query(Setting).filter(Setting.key == key).first()
        if not existing:
            setting = Setting(key=key, value=value)
            db.add(setting)
            created.append(key)

    if created:
        log = SystemLog(
            module="settings",
            action="seed",
            details=f"Seeded default settings: {', '.join(created)}",
        )
        db.add(log)
        db.commit()

    return {"message": "Settings seeded", "created": created, "total_defaults": len(defaults)}