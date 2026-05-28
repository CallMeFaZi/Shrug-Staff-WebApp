# SHRUG STAFF — AI Face Recognition Attendance & Payroll System

## Architecture & Implementation Plan

---

## 1. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React + TypeScript + Tailwind CSS | Web app UI |
| **Face Detection (Client)** | MediaPipe FaceMesh / TensorFlow.js | Real-time face detection in browser |
| **State Management** | Zustand + React Context | Lightweight state |
| **Charts** | Recharts | Admin dashboard visualizations |
| **Backend** | FastAPI (Python) | REST API server |
| **ORM** | SQLAlchemy | Database interaction |
| **Migrations** | Alembic | Schema versioning |
| **Face Recognition (Server)** | InsightFace / face_recognition | Face encoding matching |
| **Image Processing** | OpenCV | Image handling |
| **Database** | PostgreSQL | Primary data store |
| **Auth** | PIN-based global admin access | Admin panel security |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER (React SPA)                       │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────────────┐  │
│  │ Splash   │  │ Camera   │  │ Attendance              │  │
│  │ Screen   │  │ Capture  │  │ Success / Confirmation  │  │
│  └──────────┘  └──────────┘  └─────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              ADMIN DASHBOARD (PIN-protected)          │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │  │
│  │  │Employees│ │Attendance│ │ Payroll  │ │ Reports │ │  │
│  │  └─────────┘ └──────────┘ └──────────┘ └─────────┘ │  │
│  │  ┌─────────┐ ┌──────────┐                            │  │
│  │  │  Logs   │ │ Settings │                            │  │
│  │  └─────────┘ └──────────┘                            │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / REST API
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  FASTAPI BACKEND SERVER                      │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │  Auth    │  │   Face       │  │  Attendance          │  │
│  │  Router  │  │   Recognition│  │  Router              │  │
│  └──────────┘  └──────────────┘  └─────────────────────┘  │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ Payroll  │  │  Employee    │  │  Settings            │  │
│  │ Router   │  │  Router      │  │  Router              │  │
│  └──────────┘  └──────────────┘  └─────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Face Recognition Engine (InsightFace)               │  │
│  │  - Encode face from image                            │  │
│  │  - Compare against stored encodings                  │  │
│  │  - Confidence scoring & threshold                    │  │
│  │  - Anti-spoofing (blink detection)                   │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ SQLAlchemy ORM
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   POSTGRESQL DATABASE                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │employees │  │employee_ │  │  shifts  │  │attendance│  │
│  │          │  │  faces   │  │          │  │          │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│  ┌──────────┐   ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │attendance│   │  payroll │  │system_log│  │settings  │ │
│  │  _logs   │   │          │  │          │  │          │ │
│  └──────────┘   └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend Route Map

```
/                  → Splash / Landing Page
/attendance        → Camera Detection Screen
/confirm/:id       → Employee Confirmation Screen
/success           → Attendance Success Screen
/admin             → Admin Dashboard (PIN prompt first)
/admin/login       → PIN Entry Screen
/admin/dashboard   → Admin Dashboard Home (widgets)
/admin/employees   → Employee Management
/admin/attendance  → Attendance Records
/admin/payroll     → Payroll Management
/admin/reports     → Reports
/admin/logs        → System Logs
/admin/settings    → Settings (change PIN, configure rules)
```

---

## 4. Database Schema (All Tables)

### 4.1 `employees`
```sql
CREATE TABLE employees (
    id              SERIAL PRIMARY KEY,
    employee_code   VARCHAR(20) UNIQUE NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    monthly_salary  DECIMAL(12,2) NOT NULL DEFAULT 0,
    hourly_rate     DECIMAL(8,2) NOT NULL DEFAULT 0,
    shift_id        INTEGER REFERENCES shifts(id),
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

### 4.2 `employee_faces`
```sql
CREATE TABLE employee_faces (
    id              SERIAL PRIMARY KEY,
    employee_id     INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    face_encoding   TEXT NOT NULL,             -- JSON array of 128-dimensional vector
    image_path      VARCHAR(255),              -- Path to reference image
    created_at      TIMESTAMP DEFAULT NOW()
);
```

### 4.3 `shifts`
```sql
CREATE TABLE shifts (
    id              SERIAL PRIMARY KEY,
    shift_name      VARCHAR(50) NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    grace_minutes   INTEGER DEFAULT 15,
    minimum_hours   DECIMAL(4,2) DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

### 4.4 `attendance`
```sql
CREATE TABLE attendance (
    id              SERIAL PRIMARY KEY,
    employee_id     INTEGER REFERENCES employees(id),
    attendance_date DATE NOT NULL,
    clock_in        TIMESTAMP,
    clock_out       TIMESTAMP,
    total_hours     DECIMAL(5,2) DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'present',  -- present, absent, late, incomplete
    payment         DECIMAL(12,2) DEFAULT 0,
    reason          TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, attendance_date)
);
```

### 4.5 `attendance_logs`
```sql
CREATE TABLE attendance_logs (
    id              SERIAL PRIMARY KEY,
    employee_id     INTEGER REFERENCES employees(id),
    action          VARCHAR(50) NOT NULL,       -- clock_in, clock_out, system_correction
    details         TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

### 4.6 `payroll`
```sql
CREATE TABLE payroll (
    id              SERIAL PRIMARY KEY,
    employee_id     INTEGER REFERENCES employees(id),
    month           INTEGER NOT NULL,
    year            INTEGER NOT NULL,
    total_days      INTEGER DEFAULT 0,
    present_days    INTEGER DEFAULT 0,
    absent_days     INTEGER DEFAULT 0,
    late_days       INTEGER DEFAULT 0,
    unpaid_days     INTEGER DEFAULT 0,
    total_salary    DECIMAL(12,2) DEFAULT 0,
    deductions      DECIMAL(12,2) DEFAULT 0,
    final_salary    DECIMAL(12,2) DEFAULT 0,
    generated_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, month, year)
);
```

### 4.7 `system_logs`
```sql
CREATE TABLE system_logs (
    id              SERIAL PRIMARY KEY,
    module          VARCHAR(50) NOT NULL,
    action          VARCHAR(100) NOT NULL,
    details         TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

### 4.8 `settings`
```sql
CREATE TABLE settings (
    id              SERIAL PRIMARY KEY,
    key             VARCHAR(100) UNIQUE NOT NULL,
    value           TEXT NOT NULL,
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

**Default settings rows:**
| key | value |
|-----|-------|
| `admin_pin` | `969600` |
| `grace_minutes` | `15` |
| `late_deduction_interval` | `5` (minutes) |
| `late_deduction_amount` | `100` (PKR) |
| `late_max_minutes` | `30` (after this, absent) |
| `working_days_per_month` | `26` |
| `daily_working_hours` | `10.4` |

---

## 5. Salary Calculation Logic

### Formula
```
hourly_rate = monthly_salary / (working_days_per_month * daily_working_hours)
```

### Example
- Monthly Salary: 36,000 PKR
- Working Days: 26
- Daily Hours: 10.4
- Hourly Rate: 36000 / (26 × 10.4) = 36000 / 270.4 ≈ **133 PKR/hour**

### Daily Pay Calculation
```
daily_pay = total_hours_worked × hourly_rate
```

---

## 6. Attendance Rules (Implementation Logic)

### Rule 1 — Late Attendance
```python
# Grace period check
shift_start = shift.start_time  # e.g., 09:00
actual_clock_in = clock_in.time()

if actual_clock_in <= shift_start + timedelta(minutes=grace_minutes):
    # On time — no deduction
    pass
elif actual_clock_in > shift_start + timedelta(minutes=grace_minutes):
    # Late — calculate deductions
    late_minutes = (actual_clock_in - shift_start).total_seconds() / 60 - grace_minutes

    if late_minutes > 30:
        # More than 30 min late = absent for the day
        status = "absent"
        payment = 0
    else:
        # Deduct 100 PKR for every 5 min block after grace period
        deduction_blocks = late_minutes // 5  # integer division
        deductions = deduction_blocks * 100
        status = "late"
```

### Rule 2 — Missing Clock-Out
- If clock_in exists but clock_out is NULL at end of day, mark as `incomplete`
- Payment = 0

### Rule 3 — Missing Clock-In
- No attendance record for the date → automatic `absent`
- Payment = 0

### Rule 4 — Duplicate Attendance Prevention
- `UNIQUE(employee_id, attendance_date)` constraint in DB
- Each employee can only have ONE record per calendar date

---

## 7. Face Recognition Flow

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  Browser Camera │────▶│ MediaPipe FaceMesh   │────▶│ Face detected?  │
│  (getUserMedia) │     │ (client-side detect) │     │ Yes / No        │
└─────────────────┘     └─────────────────────┘     └────────┬────────┘
                                                              │ Yes
                                                              ▼
                                                   ┌─────────────────────┐
                                                   │ Capture face image  │
                                                   │ (canvas snapshot)   │
                                                   └──────────┬──────────┘
                                                              │
                                                              ▼
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  Match Result   │◀────│ InsightFace Compare  │◀────│ Send image to   │
│  (employee or   │     │ (server-side)       │     │ FastAPI backend │
│   unknown)      │     │                     │     │ /api/recognize  │
└─────────────────┘     └─────────────────────┘     └─────────────────┘
       │
       ▼
┌─────────────────┐     ┌─────────────────────┐
│  Confirmed      │────▶│ Confirmation Screen │
│  Match          │     │ "Is this you?"      │
└─────────────────┘     └─────────────────────┘
       │                       │ No
       ▼                       ▼
┌─────────────────┐     ┌─────────────────────┐
│  Clock In/Out   │     │  Return to camera   │
│  (with blink    │     │  (retry)            │
│   anti-spoof)   │     └─────────────────────┘
└─────────────────┘
```

### Anti-Spoofing — Blink Detection
- Before marking attendance, require the user to blink
- MediaPipe FaceMesh tracks eye landmarks
- If EAR (Eye Aspect Ratio) drops below threshold and rises again → blink detected
- Only then is attendance confirmed

---

## 8. API Endpoints

### Public (No PIN required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/recognize` | Upload face image, receive matched employee or unknown |
| POST | `/api/clock-in` | Record clock-in for recognized employee |
| POST | `/api/clock-out` | Record clock-out for recognized employee |
| GET  | `/api/employee/:id` | Get employee details for confirmation screen |

### Admin (PIN required — sent via X-Admin-PIN header)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/verify-pin` | Verify admin PIN, receive session token |
| GET  | `/api/admin/dashboard` | Dashboard widget data |
| GET  | `/api/admin/employees` | List all employees |
| POST | `/api/admin/employees` | Add new employee |
| PUT  | `/api/admin/employees/:id` | Update employee |
| DELETE | `/api/admin/employees/:id` | Deactivate employee |
| POST | `/api/admin/employees/:id/face` | Register face encoding for employee |
| GET  | `/api/admin/attendance` | Attendance records (with filters) |
| GET  | `/api/admin/attendance/today` | Today's attendance summary |
| GET  | `/api/admin/payroll` | Payroll records |
| POST | `/api/admin/payroll/generate` | Generate payroll for a month |
| GET  | `/api/admin/reports` | Report data for charts |
| GET  | `/api/admin/logs` | System logs |
| GET  | `/api/admin/settings` | Get all settings |
| PUT  | `/api/admin/settings` | Update settings (includes PIN change) |

---

## 9. Project Folder Structure

```
shrug-staff/
├── frontend/                    # React + TypeScript SPA
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── Camera/
│   │   │   │   ├── CameraCapture.tsx
│   │   │   │   ├── FaceDetection.tsx
│   │   │   │   └── BlinkDetector.ts
│   │   │   ├── Layout/
│   │   │   │   ├── AdminLayout.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   ├── common/
│   │   │   │   ├── PinModal.tsx
│   │   │   │   ├── StatsCard.tsx
│   │   │   │   └── DataTable.tsx
│   │   │   └── charts/
│   │   │       ├── AttendanceChart.tsx
│   │   │       └── PayrollChart.tsx
│   │   ├── pages/
│   │   │   ├── SplashPage.tsx
│   │   │   ├── AttendancePage.tsx
│   │   │   ├── ConfirmPage.tsx
│   │   │   ├── SuccessPage.tsx
│   │   │   └── admin/
│   │   │       ├── AdminLogin.tsx
│   │   │       ├── DashboardPage.tsx
│   │   │       ├── EmployeesPage.tsx
│   │   │       ├── AttendanceRecords.tsx
│   │   │       ├── PayrollPage.tsx
│   │   │       ├── ReportsPage.tsx
│   │   │       ├── LogsPage.tsx
│   │   │       └── SettingsPage.tsx
│   │   ├── hooks/
│   │   │   ├── useCamera.ts
│   │   │   └── useFaceDetection.ts
│   │   ├── api/
│   │   │   ├── client.ts          # Axios instance
│   │   │   ├── attendance.ts
│   │   │   ├── employees.ts
│   │   │   └── admin.ts
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   └── attendanceStore.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── backend/                     # FastAPI Python
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Settings/config
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── employee.py
│   │   │   ├── employee_face.py
│   │   │   ├── shift.py
│   │   │   ├── attendance.py
│   │   │   ├── attendance_log.py
│   │   │   ├── payroll.py
│   │   │   ├── system_log.py
│   │   │   └── setting.py
│   │   ├── schemas/             # Pydantic models
│   │   │   ├── __init__.py
│   │   │   ├── employee.py
│   │   │   ├── attendance.py
│   │   │   ├── payroll.py
│   │   │   └── ...
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── recognition.py
│   │   │   ├── attendance.py
│   │   │   ├── admin_auth.py
│   │   │   ├── employees.py
│   │   │   ├── payroll.py
│   │   │   ├── reports.py
│   │   │   ├── logs.py
│   │   │   └── settings.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── face_recognition.py
│   │   │   ├── salary_calculator.py
│   │   │   └── attendance_rules.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── security.py
│   ├── alembic/
│   │   ├── versions/
│   │   └── alembic.ini
│   ├── requirements.txt
│   └── Dockerfile
│
├── database/
│   └── init.sql                  # Schema + seed data
│
├── docker-compose.yml            # PostgreSQL + Backend
├── .env.example
├── README.md
└── LICENSE
```

---

## 10. Implementation Phases

### PHASE 1 — Foundation (Frontend + Backend + Face Recognition)
| Step | Task | Details |
|------|------|---------|
| 1.1 | Project scaffolding | Set up React (Vite) + FastAPI projects with folder structure |
| 1.2 | Database setup | PostgreSQL schema via Alembic migrations, seed default settings |
| 1.3 | Backend models + schemas | All SQLAlchemy models + Pydantic schemas |
| 1.4 | Backend API — Employees CRUD | Full CRUD for employees, shifts, employee_faces |
| 1.5 | Backend — Face Recognition Engine | InsightFace integration: encode, store, match |
| 1.6 | Backend — Attendance API | Clock-in, clock-out, status determination |
| 1.7 | Backend — Attendance Rules Engine | Late logic, missing clock-in/out, duplicate prevention |
| 1.8 | Frontend — Splash + Layout | Splash page, basic routing, layout shell |
| 1.9 | Frontend — Camera + Face Detection | MediaPipe integration, capture, blink detection |
| 1.10 | Frontend — Confirmation + Success | Employee confirmation, success feedback |

### PHASE 2 — Admin Dashboard
| Step | Task | Details |
|------|------|---------|
| 2.1 | Backend — Admin Auth | PIN verification endpoint, session token |
| 2.2 | Backend — Dashboard API | Widget data aggregation endpoints |
| 2.3 | Backend — Settings API | CRUD for settings (PIN, late rules, working days) |
| 2.4 | Frontend — Admin Login | PIN entry modal/screen |
| 2.5 | Frontend — Dashboard Widgets | Stats cards, charts for employees present/absent/late/payroll |
| 2.6 | Frontend — Employee Management | Table with CRUD, face registration upload |
| 2.7 | Frontend — Attendance Records | Filterable table of attendance |
| 2.8 | Frontend — Settings Page | Change PIN, configure late rules, working days/hours |

### PHASE 3 — Payroll, Reports & Logs
| Step | Task | Details |
|------|------|---------|
| 3.1 | Backend — Payroll Calculation Engine | Generate payroll per employee per month |
| 3.2 | Backend — Payroll API | List, generate, view details |
| 3.3 | Backend — Reports API | Aggregated data for charts/export |
| 3.4 | Backend — System Logging | Automatic logging on all major actions |
| 3.5 | Frontend — Payroll Page | View, generate, filter payroll records |
| 3.6 | Frontend — Reports Page | Charts (attendance trends, payroll trends) |
| 3.7 | Frontend — Logs Page | Filterable system log viewer |

### PHASE 4 — Polish & Security
| Step | Task | Details |
|------|------|---------|
| 4.1 | Anti-spoofing refinement | Enhanced blink detection, confidence threshold tuning |
| 4.2 | Error handling + validation | Robust form validation, error states |
| 4.3 | Loading states + UX polish | Skeleton loaders, transitions, mobile-friendly |
| 4.4 | Docker + deployment | docker-compose for full stack, deployment guide |

---

## 11. Face Recognition — Technical Details

### Client-Side (Browser)
- **Library**: MediaPipe FaceMesh (via `@mediapipe/face_mesh`)
- **Purpose**: Detect face landmarks, crop face region, ensure face is present before sending
- **Blink Detection**: EAR (Eye Aspect Ratio) calculation from eye landmarks

### Server-Side (Backend)
- **Library**: InsightFace (`insightface`) Python package
- **Model**: `buffalo_l` (lightweight, good accuracy)
- **Encoding**: 512-dimensional float vector, stored as JSON array in DB
- **Matching**: Cosine similarity between live encoding and stored encodings
- **Threshold**: Default confidence 0.6 (configurable in settings)

---

## 12. Admin Panel — PIN Flow

```
User clicks "Admin Panel" button on any page
                │
                ▼
┌─────────────────────────────┐
│     PIN Entry Modal         │
│                             │
│    ●  ●  ●  ●  ●  ●        │
│                             │
│    [1] [2] [3]              │
│    [4] [5] [6]              │
│    [7] [8] [9]              │
│         [0]                 │
│                             │
│    Default: 969600          │
└─────────────────────────────┘
                │
                ▼
        ┌──────────────┐
        │  Verify PIN   │────▶ POST /api/admin/verify-pin
        └──────┬───────┘
               │
         ┌─────┴─────┐
         │ Correct   │ Incorrect
         ▼           ▼
   ┌──────────┐  ┌──────────┐
   │ Dashboard│  │  Error   │
   │   Page   │  │  "Wrong  │
   │          │  │  PIN"    │
   └──────────┘  └──────────┘
```

The PIN is stored in the `settings` table under key `admin_pin`. It can be changed from **Settings** page inside the admin panel.

---

## 13. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Face detection location | Browser (MediaPipe) | Reduces server load, improves privacy, faster feedback |
| Face matching location | Server (InsightFace) | Stored face encodings are server-side, consistent matching |
| State management | Zustand | Lightweight, simple, TypeScript-friendly |
| Admin auth | Global PIN | Simple, no user management needed for v1 |
| CSS framework | Tailwind CSS | Utility-first, rapid UI development |
| Build tool | Vite | Fast dev server, optimized builds |
| API style | REST | Simple, well-understood, easy to debug |

---

## 14. Docker Deployment

```yaml
# docker-compose.yml structure
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: shrug_staff
      POSTGRES_USER: shrug_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://shrug_admin:${DB_PASSWORD}@postgres:5432/shrug_staff

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

---

## 15. Future Enhancements (Post v1)

- Multi-admin users with individual PINs
- Email/SMS notifications for attendance anomalies
- Biometric (fingerprint) as secondary auth
- Export reports to PDF/Excel
- Mobile PWA support (offline mode)
- Cloud sync between multiple branches