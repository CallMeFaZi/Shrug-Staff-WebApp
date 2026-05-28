-- SHRUG STAFF Database Initialization
-- PostgreSQL schema

-- Create database and user
-- Run these as superuser:
-- CREATE USER shrug_admin WITH PASSWORD 'shrug_pass';
-- CREATE DATABASE shrug_staff OWNER shrug_admin;
-- \c shrug_staff

-- ============== TABLES ==============

CREATE TABLE IF NOT EXISTS shifts (
    id              SERIAL PRIMARY KEY,
    shift_name      VARCHAR(50) NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    grace_minutes   INTEGER DEFAULT 15,
    minimum_hours   DECIMAL(4, 2) DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
    id              SERIAL PRIMARY KEY,
    employee_code   VARCHAR(20) UNIQUE NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    monthly_salary  DECIMAL(12, 2) NOT NULL DEFAULT 0,
    hourly_rate     DECIMAL(8, 2) NOT NULL DEFAULT 0,
    shift_id        INTEGER REFERENCES shifts(id),
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_faces (
    id              SERIAL PRIMARY KEY,
    employee_id     INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    face_encoding   TEXT NOT NULL,
    image_path      VARCHAR(255),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
    id              SERIAL PRIMARY KEY,
    employee_id     INTEGER REFERENCES employees(id),
    attendance_date DATE NOT NULL,
    clock_in        TIMESTAMP WITH TIME ZONE,
    clock_out       TIMESTAMP WITH TIME ZONE,
    total_hours     DECIMAL(5, 2) DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'present',
    payment         DECIMAL(12, 2) DEFAULT 0,
    reason          TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS attendance_logs (
    id              SERIAL PRIMARY KEY,
    employee_id     INTEGER REFERENCES employees(id),
    action          VARCHAR(50) NOT NULL,
    details         TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll (
    id              SERIAL PRIMARY KEY,
    employee_id     INTEGER REFERENCES employees(id),
    month           INTEGER NOT NULL,
    year            INTEGER NOT NULL,
    total_days      INTEGER DEFAULT 0,
    present_days    INTEGER DEFAULT 0,
    absent_days     INTEGER DEFAULT 0,
    late_days       INTEGER DEFAULT 0,
    unpaid_days     INTEGER DEFAULT 0,
    total_salary    DECIMAL(12, 2) DEFAULT 0,
    deductions      DECIMAL(12, 2) DEFAULT 0,
    final_salary    DECIMAL(12, 2) DEFAULT 0,
    generated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, month, year)
);

CREATE TABLE IF NOT EXISTS system_logs (
    id              SERIAL PRIMARY KEY,
    module          VARCHAR(50) NOT NULL,
    action          VARCHAR(100) NOT NULL,
    details         TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
    id              SERIAL PRIMARY KEY,
    key             VARCHAR(100) UNIQUE NOT NULL,
    value           TEXT NOT NULL DEFAULT '',
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============== DEFAULT SETTINGS ==============

INSERT INTO settings (key, value) VALUES
    ('admin_pin', '969600'),
    ('grace_minutes', '15'),
    ('late_deduction_interval', '5'),
    ('late_deduction_amount', '100'),
    ('late_max_minutes', '30'),
    ('working_days_per_month', '26'),
    ('daily_working_hours', '10.4'),
    ('face_confidence_threshold', '0.65'),
    ('face_model', 'MediaPipe')
ON CONFLICT (key) DO NOTHING;

-- ============== DEFAULT SHIFTS ==============

INSERT INTO shifts (shift_name, start_time, end_time, grace_minutes, minimum_hours) VALUES
    ('Morning Shift', '09:00', '18:00', 15, 9.0),
    ('Evening Shift', '14:00', '23:00', 15, 9.0),
    ('Night Shift', '22:00', '07:00', 15, 9.0)
ON CONFLICT DO NOTHING;

-- ============== INDEXES ==============

CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month_year ON payroll(month, year);
CREATE INDEX IF NOT EXISTS idx_system_logs_module ON system_logs(module);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee ON attendance_logs(employee_id);