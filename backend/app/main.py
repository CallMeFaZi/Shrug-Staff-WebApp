from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, ensure_all_tables_and_columns
from app.routers import (
    recognition_router,
    attendance_router,
    admin_auth_router,
    employees_router,
    payroll_router,
    reports_router,
    logs_router,
    settings_router,
    settings_admin_router,
    dashboard_router,
    adjustments_router,
)

# Create all tables and ensure schema is up-to-date
Base.metadata.create_all(bind=engine)
ensure_all_tables_and_columns()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Register routers
app.include_router(recognition_router)
app.include_router(attendance_router)
app.include_router(admin_auth_router)
app.include_router(employees_router)
app.include_router(payroll_router)
app.include_router(reports_router)
app.include_router(logs_router)
app.include_router(settings_router)
app.include_router(settings_admin_router)
app.include_router(dashboard_router)
app.include_router(adjustments_router)
