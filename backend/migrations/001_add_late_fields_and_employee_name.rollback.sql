-- Rollback script for migration 001_add_late_fields_and_employee_name.sql
-- This script reverts the changes made in the migration

-- Remove employee_name column from payroll table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'payroll' AND column_name = 'employee_name') THEN
        ALTER TABLE payroll DROP COLUMN employee_name;
    END IF;
END $$;

-- Remove late_minutes and late_deduction columns from attendance table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'attendance' AND column_name = 'late_minutes') THEN
        ALTER TABLE attendance DROP COLUMN late_minutes;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'attendance' AND column_name = 'late_deduction') THEN
        ALTER TABLE attendance DROP COLUMN late_deduction;
    END IF;
END $$;