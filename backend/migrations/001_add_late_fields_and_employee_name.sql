-- Migration script to add late tracking fields and employee name to payroll
-- This script should be run when deploying the application

-- Add late_minutes and late_deduction columns to attendance table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance' AND column_name = 'late_minutes') THEN
        ALTER TABLE attendance ADD COLUMN late_minutes NUMERIC(5, 2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance' AND column_name = 'late_deduction') THEN
        ALTER TABLE attendance ADD COLUMN late_deduction NUMERIC(12, 2) DEFAULT 0;
    END IF;
END $$;

-- Add employee_name column to payroll table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payroll' AND column_name = 'employee_name') THEN
        ALTER TABLE payroll ADD COLUMN employee_name VARCHAR;
    END IF;
END $$;