"""Fix Food Tests experiment class_level: Form4 -> Form3

Revision ID: b1c2d3e4f5a6
Revises: a3f8c9d2e1b5
Create Date: 2026-09-17 10:00:00.000000

Problem
-------
The "Food Tests" experiment (id=3) was inserted into the database with
class_level='Form4'. The canonical seed definition correctly assigns it
class_level='Form3' (it is a Form 3 Biology practical). This data
corruption caused Form 4 students to see a Form 3 experiment.

Safety
------
- Only the single row where title='Food Tests' AND class_level='Form4'
  is updated. If the row does not match this exact state the UPDATE
  affects 0 rows and no data is changed.
- Experiment IDs, submissions, and teacher feedback are not touched.
- The migration is fully reversible (downgrade restores Form4).

Verification
------------
Before applying: SELECT id, title, class_level FROM experiments WHERE title='Food Tests';
Expected:        id=3, title='Food Tests', class_level='Form4'
After applying:  class_level='Form3'
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a3f8c9d2e1b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Correct the class_level of 'Food Tests' from 'Form4' to 'Form3'.

    The WHERE clause matches ONLY the exact corrupted row:
      - title must be 'Food Tests'
      - class_level must currently be 'Form4'
      - simulation_type must be 'food_tests'

    If the record has already been corrected (class_level='Form3'), or if
    a row matching this description does not exist, the UPDATE is a no-op.
    """
    bind = op.get_bind()

    result = bind.execute(
        sa.text(
            """
            UPDATE experiments
               SET class_level = 'Form3'
             WHERE title = 'Food Tests'
               AND class_level = 'Form4'
               AND simulation_type = 'food_tests'
            """
        )
    )

    # Log how many rows were actually updated for audit purposes.
    rows_affected = result.rowcount
    if rows_affected == 1:
        print(
            "[b1c2d3e4f5a6] UPGRADE: 'Food Tests' corrected: "
            "class_level 'Form4' -> 'Form3' (1 row updated)"
        )
    elif rows_affected == 0:
        print(
            "[b1c2d3e4f5a6] UPGRADE: 'Food Tests' was already correct or not found "
            "— 0 rows updated (safe no-op)"
        )
    else:
        print(
            f"[b1c2d3e4f5a6] UPGRADE WARNING: {rows_affected} rows updated "
            "(expected 1). Review experiments table."
        )


def downgrade() -> None:
    """
    Reverse: restore class_level of 'Food Tests' back to 'Form4'.

    This is provided for completeness. Applying this downgrade intentionally
    re-introduces the data corruption. Only use if rolling back this migration.
    """
    bind = op.get_bind()

    result = bind.execute(
        sa.text(
            """
            UPDATE experiments
               SET class_level = 'Form4'
             WHERE title = 'Food Tests'
               AND class_level = 'Form3'
               AND simulation_type = 'food_tests'
            """
        )
    )

    rows_affected = result.rowcount
    print(
        f"[b1c2d3e4f5a6] DOWNGRADE: 'Food Tests' reverted "
        f"class_level 'Form3' -> 'Form4' ({rows_affected} row(s) updated)"
    )
