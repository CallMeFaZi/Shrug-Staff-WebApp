from app.routers.recognition import router as recognition_router
from app.routers.attendance import router as attendance_router
from app.routers.admin_auth import router as admin_auth_router
from app.routers.employees import router as employees_router
from app.routers.payroll import router as payroll_router
from app.routers.reports import router as reports_router
from app.routers.logs import router as logs_router
from app.routers.settings import router as settings_router, admin_router as settings_admin_router
from app.routers.dashboard import router as dashboard_router
from app.routers.adjustments import router as adjustments_router

__all__ = [
    "recognition_router",
    "attendance_router",
    "admin_auth_router",
    "employees_router",
    "payroll_router",
    "reports_router",
    "logs_router",
    "settings_router",
    "settings_admin_router",
    "dashboard_router",
    "adjustments_router",
]