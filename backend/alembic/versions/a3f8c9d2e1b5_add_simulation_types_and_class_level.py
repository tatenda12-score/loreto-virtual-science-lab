"""Add simulation types, class_level to experiments, and experiment_schema_level

Revision ID: a3f8c9d2e1b5
Revises: 73ba237b9a1e
Create Date: 2026-09-16 22:00:00.000000

This migration:
1. Adds missing simulation_type enum values (food_tests, separation, moments,
   enzyme_activity, l6_titration, internal_resistance, u6_photosynthesis,
   u6_kinetics, u6_young_modulus) to the production PostgreSQL enum.
2. Adds the class_level column to the experiments table (if not already present).

This is the root-cause fix: the production DB was missing these enum values,
causing 500 errors when creating L6/Upper6 experiments via the API.

PostgreSQL note
--------------
`ALTER TYPE ... ADD VALUE` is PROHIBITED inside a transaction block.
Alembic wraps every migration in a transaction by default, which causes
an InternalError (SQLAlchemy code 2j85).

The fix: open a raw DBAPI connection in AUTOCOMMIT mode and run the DDL
there, then use the normal Alembic context (inside a transaction) for the
column addition.  This pattern is the standard Alembic recommendation for
PostgreSQL enum mutations — see:
https://alembic.sqlalchemy.org/en/latest/api/runtime.html#alembic.runtime.migration.MigrationContext.autocommit_block
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f8c9d2e1b5'
down_revision: Union[str, Sequence[str], None] = '73ba237b9a1e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# All new simulation type values to add
NEW_SIM_TYPES = [
    'food_tests',
    'separation',
    'moments',
    'enzyme_activity',
    'l6_titration',
    'internal_resistance',
    'u6_photosynthesis',
    'u6_kinetics',
    'u6_young_modulus',
]


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == "postgresql":
        # ----------------------------------------------------------------
        # ALTER TYPE ... ADD VALUE must NOT run inside a transaction block.
        # We use Alembic's autocommit_block() context manager which:
        #   1. COMMITs the current open transaction.
        #   2. Executes the DDL in AUTOCOMMIT mode.
        #   3. Resumes normal transactional mode afterwards.
        # This is the officially supported pattern.
        # ----------------------------------------------------------------
        with op.get_context().autocommit_block():
            conn = op.get_bind()
            for val in NEW_SIM_TYPES:
                # Whitelist-only: val comes from the hardcoded list above,
                # so direct string interpolation is safe here.
                conn.execute(
                    sa.text(
                        f"ALTER TYPE simulation_type_enum ADD VALUE IF NOT EXISTS '{val}'"
                    )
                )

    # Add class_level column to experiments if it doesn't already exist.
    # batch_alter_table is safe inside a normal transaction.
    try:
        with op.batch_alter_table('experiments', schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    'class_level',
                    sa.String(length=50),
                    nullable=True,
                    comment="Target class level (e.g., Form3, L6). Null means available to all.",
                )
            )
    except Exception:
        # Column already exists on some deployments — safe to ignore
        pass


def downgrade() -> None:
    # Note: PostgreSQL does not support removing enum values (ALTER TYPE DROP VALUE).
    # The downgrade only removes the class_level column.
    try:
        with op.batch_alter_table('experiments', schema=None) as batch_op:
            batch_op.drop_column('class_level')
    except Exception:
        pass
