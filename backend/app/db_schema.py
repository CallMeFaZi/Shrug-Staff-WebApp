from sqlalchemy import inspect, text
from app.database import engine, Base

# Import models so Base knows all tables
from app import models  # noqa: F401


REQUIRED_COLUMNS = {
    "payroll": {
        "employee_name": "VARCHAR",
    },
    "attendance": {
        "late_minutes": "DECIMAL(5, 2)",
        "late_deduction": "DECIMAL(12, 2) DEFAULT 0",
    },
}


REQUIRED_TABLES_SQL = [
    """
    CREATE TABLE IF NOT EXISTS employee_adjustments (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        type VARCHAR(10) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        reason TEXT NOT NULL,
        adjustment_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_employee_adjustments_employee
    ON employee_adjustments(employee_id);
    """,
]


def ensure_database_schema():
    """
    Creates missing tables and adds missing columns.
    Useful for Render rebuilds/redeploys where old DB already exists.
    """

    # Create missing tables from SQLAlchemy models
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)

    with engine.begin() as conn:
        existing_tables = inspector.get_table_names()

        for table_name, columns in REQUIRED_COLUMNS.items():
            if table_name not in existing_tables:
                continue

            existing_columns = {
                column["name"]
                for column in inspector.get_columns(table_name)
            }

            for column_name, column_type in columns.items():
                if column_name not in existing_columns:
                    conn.execute(
                        text(
                            f'ALTER TABLE "{table_name}" '
                            f'ADD COLUMN "{column_name}" {column_type}'
                        )
                    )

        for sql in REQUIRED_TABLES_SQL:
            conn.execute(text(sql))