# Database Migrations

This directory contains SQL migration scripts for updating the database schema.

## Migration Scripts

- `001_add_late_fields_and_employee_name.sql`: Adds late tracking fields (late_minutes, late_deduction) to the attendance table and employee_name to the payroll table
- `001_add_late_fields_and_employee_name.rollback.sql`: Reverts the changes made in the migration

## Usage

To apply the migration:
```bash
psql -h <host> -U <user> -d <database> -f migrations/001_add_late_fields_and_employee_name.sql
```

To rollback the migration:
```bash
psql -h <host> -U <user> -d <database> -f migrations/001_add_late_fields_and_employee_name.rollback.sql
```

Note: Replace <host>, <user>, and <database> with your actual database connection details.