"""Initial schema (PostgreSQL and SQLite compatible)

Revision ID: fad7289030d4
Revises: 
Create Date: 2026-08-23 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'fad7289030d4'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Users Table ────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False, comment="User's full legal name"),
        sa.Column('email', sa.String(length=255), nullable=False, comment='Institutional email address; used as login identifier'),
        sa.Column('hashed_password', sa.String(length=255), nullable=False, comment='bcrypt hash — never store the plain-text password'),
        sa.Column('role', sa.Enum('admin', 'teacher', 'student', name='userrole'), nullable=False, comment='System role that drives all permission checks'),
        sa.Column('is_active', sa.Boolean(), nullable=False, comment='Soft-disable a user without deleting their record'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, comment='Set to True after email verification is complete'),
        sa.Column('class_level', sa.String(length=50), nullable=True, comment="e.g. 'JSS1', 'SS2'. Populated for student accounts only."),
        sa.Column('subject_code', sa.String(length=50), nullable=True, comment="e.g. 'BIO101'. Populated for teacher accounts only."),
        sa.Column('gender', sa.String(length=20), nullable=True, comment='Optional — used for school reporting only.'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, comment='Row creation timestamp (UTC)'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, comment='Last modification timestamp (UTC)'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index('ix_users_role', 'users', ['role'], unique=False)
    op.create_index('ix_users_role_class', 'users', ['role', 'class_level'], unique=False)
    op.create_index('ix_users_role_subject', 'users', ['role', 'subject_code'], unique=False)

    # ── 2. Experiments Table ──────────────────────────────────────────────────
    op.create_table(
        'experiments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False, comment='Human-readable experiment title'),
        sa.Column('subject', sa.Enum('Physics', 'Chemistry', 'Biology', name='subject_enum'), nullable=False, comment='Curriculum subject area'),
        sa.Column('difficulty', sa.Enum('Beginner', 'Intermediate', 'Advanced', name='difficulty_enum'), nullable=False, comment='Difficulty tier for student guidance'),
        sa.Column('simulation_type', sa.Enum('ohms_law', 'titration', 'velocity', 'ph', 'generic', name='simulation_type_enum'), nullable=False, server_default='generic', comment='Simulation interface type'),
        sa.Column('status', sa.Enum('draft', 'published', 'archived', name='experiment_status_enum'), nullable=False, server_default='draft', comment='Publication status'),
        sa.Column('topic', sa.String(length=255), nullable=True, comment='Curriculum topic'),
        sa.Column('description', sa.Text(), nullable=False, comment='Overview paragraph shown to students before they start'),
        sa.Column('materials', sa.JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=True, comment='Apparatus/materials required'),
        sa.Column('instructions', sa.JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=True, comment='Ordered list of step objects'),
        sa.Column('parameters', sa.JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=True, comment='Formula constants, expected values, tolerances'),
        sa.Column('created_by', sa.Integer(), nullable=True, comment='FK → users.id of creator'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], name='fk_experiment_creator', ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_experiments_created_by', 'experiments', ['created_by'], unique=False)
    op.create_index(op.f('ix_experiments_id'), 'experiments', ['id'], unique=False)
    op.create_index('ix_experiments_subject_difficulty', 'experiments', ['subject', 'difficulty'], unique=False)
    op.create_index('ix_experiments_status', 'experiments', ['status'], unique=False)
    op.create_index('ix_experiments_simulation_type', 'experiments', ['simulation_type'], unique=False)

    # ── 3. Submissions Table ──────────────────────────────────────────────────
    op.create_table(
        'submissions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False, comment='FK → users.id of student'),
        sa.Column('experiment_id', sa.Integer(), nullable=False, comment='FK → experiments.id attempted'),
        sa.Column('recorded_observations', sa.JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=True, comment='Freeform observations'),
        sa.Column('calculated_score', sa.Float(), nullable=True, comment='Auto or manual score (0-100)'),
        sa.Column('teacher_feedback', sa.Text(), nullable=True, comment='Teacher feedback'),
        sa.Column('status', sa.Enum('draft', 'submitted', 'graded', name='submissionstatus_enum'), nullable=False, server_default='draft', comment='Lifecycle state'),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True, comment='Submission timestamp'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['experiment_id'], ['experiments.id'], name='fk_submission_experiment', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], name='fk_submission_student', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_submissions_experiment_id'), 'submissions', ['experiment_id'], unique=False)
    op.create_index(op.f('ix_submissions_id'), 'submissions', ['id'], unique=False)
    op.create_index('ix_submissions_status', 'submissions', ['status'], unique=False)
    op.create_index('ix_submissions_student_experiment', 'submissions', ['student_id', 'experiment_id'], unique=False)
    op.create_index(op.f('ix_submissions_student_id'), 'submissions', ['student_id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse dependency order
    op.drop_index(op.f('ix_submissions_student_id'), table_name='submissions', if_exists=True)
    op.drop_index('ix_submissions_student_experiment', table_name='submissions', if_exists=True)
    op.drop_index('ix_submissions_status', table_name='submissions', if_exists=True)
    op.drop_index(op.f('ix_submissions_id'), table_name='submissions', if_exists=True)
    op.drop_index(op.f('ix_submissions_experiment_id'), table_name='submissions', if_exists=True)
    op.drop_table('submissions')

    op.drop_index('ix_experiments_simulation_type', table_name='experiments', if_exists=True)
    op.drop_index('ix_experiments_status', table_name='experiments', if_exists=True)
    op.drop_index('ix_experiments_subject_difficulty', table_name='experiments', if_exists=True)
    op.drop_index(op.f('ix_experiments_id'), table_name='experiments', if_exists=True)
    op.drop_index('ix_experiments_created_by', table_name='experiments', if_exists=True)
    op.drop_table('experiments')

    op.drop_index('ix_users_role_subject', table_name='users', if_exists=True)
    op.drop_index('ix_users_role_class', table_name='users', if_exists=True)
    op.drop_index('ix_users_role', table_name='users', if_exists=True)
    op.drop_index(op.f('ix_users_id'), table_name='users', if_exists=True)
    op.drop_index(op.f('ix_users_email'), table_name='users', if_exists=True)
    op.drop_table('users')

    # Explicitly drop PostgreSQL enum types on downgrade
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        sa.Enum(name="submissionstatus_enum").drop(bind, checkfirst=True)
        sa.Enum(name="experiment_status_enum").drop(bind, checkfirst=True)
        sa.Enum(name="simulation_type_enum").drop(bind, checkfirst=True)
        sa.Enum(name="difficulty_enum").drop(bind, checkfirst=True)
        sa.Enum(name="subject_enum").drop(bind, checkfirst=True)
        sa.Enum(name="userrole").drop(bind, checkfirst=True)
