"""Add late_minutes and late_deduction to attendance table

Revision ID: 002_add_late_columns
Revises: 001_initial
Create Date: 2026-06-03

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_add_late_columns'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add late_minutes column
    op.add_column('attendance', sa.Column('late_minutes', sa.Numeric(precision=5, scale=2), nullable=True))
    # Add late_deduction column
    op.add_column('attendance', sa.Column('late_deduction', sa.Numeric(precision=12, scale=2), server_default='0'))


def downgrade() -> None:
    op.drop_column('attendance', 'late_deduction')
    op.drop_column('attendance', 'late_minutes')
