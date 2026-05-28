@echo off
title SHRUG STAFF - AI Attendance & Payroll System
color 0A

echo ============================================
echo     SHRUG STAFF - Starting Application
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed! Please install Python 3.11+
    pause
    exit /b 1
)
echo [OK] Python found

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Node.js not found. Frontend will not start.
    echo        Install from: https://nodejs.org/
    set SKIP_FRONTEND=1
) else (
    echo [OK] Node.js found
)

:: Install backend dependencies if fastapi is missing
echo.
echo [1/4] Checking/installing backend dependencies...
python -c "import fastapi" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing backend packages...
    cd backend
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] pip install failed. Check requirements.txt
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [OK] Backend dependencies already installed
)

:: Install frontend deps if node_modules missing
if "%SKIP_FRONTEND%"=="" (
    if not exist "frontend\node_modules" (
        echo.
        echo [2/4] Installing frontend dependencies...
        cd frontend
        call npm install
        if %errorlevel% neq 0 (
            echo [WARN] npm install had issues. Try running manually.
        )
        cd ..
    ) else (
        echo [OK] Frontend dependencies already installed
    )
)

:: Seed database
echo.
echo [3/4] Seeding database settings...
cd backend
python seed_settings.py
cd ..

:: Start services
echo.
echo [4/4] Starting services...
echo.

:: Start backend
echo Starting backend on http://localhost:8000
start "SHRUG-Backend" cmd /k "cd /d "%cd%\backend" && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Start frontend
if "%SKIP_FRONTEND%"=="" (
    echo Starting frontend on http://localhost:5173
    start "SHRUG-Frontend" cmd /k "cd /d "%cd%\frontend" && npm run dev"
) else (
    echo [SKIP] Frontend skipped - Node.js not installed
)

echo.
echo ============================================
echo     All Services Starting!
echo ============================================
echo.
echo  Backend API:     http://localhost:8000
echo  API Docs:        http://localhost:8000/docs
if "%SKIP_FRONTEND%"=="" (
    echo  Frontend:        http://localhost:5173
)
echo  Admin PIN:       969600
echo.
echo ============================================
echo.
echo  Close individual service windows to stop.
echo  PostgreSQL must be running on port 5432.
echo.
pause