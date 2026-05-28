# SHRUG STAFF

AI Face Recognition Attendance & Payroll System

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **Face Recognition**: InsightFace (server-side)
- **Deployment**: Docker / Docker Compose

## Project Structure

```
shrug-staff/
├── frontend/          # React SPA
├── backend/           # FastAPI server
├── database/          # SQL init scripts
├── docker-compose.yml # Full stack deployment
└── plans/             # Architecture documentation
```

## Quick Start

### Option 1: Docker (Recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Admin PIN: `969600`

### Option 2: Development (Without Docker)

#### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

#### Database

Make sure PostgreSQL is running and execute:

```bash
psql -U postgres -c "CREATE USER shrug_admin WITH PASSWORD 'shrug_pass';"
psql -U postgres -c "CREATE DATABASE shrug_staff OWNER shrug_admin;"
psql -U postgres -d shrug_staff -f database/init.sql
```

## Admin Access

- **PIN**: `969600` (default, changeable in Settings)
- **Admin Panel**: Click "Admin Panel" on splash page or navigate to `/admin/login`
- **Default shifts**: Morning (9-6), Evening (2-11), Night (10-7)

## API Endpoints

### Public
- `POST /api/recognize` — Face recognition
- `POST /api/clock-in` — Clock in
- `POST /api/clock-out` — Clock out
- `GET /api/employee/:id` — Employee details

### Admin (PIN-protected)
- `POST /api/admin/verify-pin` — Admin login
- `GET /api/admin/dashboard` — Dashboard data
- `GET/POST/PUT/DELETE /api/admin/employees` — Employee CRUD
- `POST /api/admin/employees/:id/face` — Register face
- `GET /api/admin/shifts` — Shift management
- `GET /api/admin/payroll` — Payroll records
- `POST /api/admin/payroll/generate` — Generate payroll
- `GET /api/admin/reports/*` — Reports
- `GET /api/admin/logs` — System logs
- `GET/PUT /api/admin/settings` — System settings

## Default Settings

| Setting | Default | Description |
|---------|---------|-------------|
| admin_pin | 969600 | Admin panel PIN |
| grace_minutes | 15 | Late grace period |
| late_deduction_interval | 5 | Deduct every N min after grace |
| late_deduction_amount | 100 | PKR deducted per interval |
| late_max_minutes | 30 | Max late before absent |
| working_days_per_month | 26 | For salary calculation |
| daily_working_hours | 10.4 | For salary calculation |