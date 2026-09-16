"""
Run production migration directly: adds missing simulation_type enum values
and ensures class_level column exists in experiments table.

This is safe to run multiple times (IF NOT EXISTS prevents duplicates).

Usage:
    python run_prod_migration.py <DATABASE_URL>
    
    or set PROD_DATABASE_URL environment variable.
"""
import sys
import os

# Get production DB URL
prod_db_url = os.environ.get('PROD_DATABASE_URL') or (sys.argv[1] if len(sys.argv) > 1 else None)

if not prod_db_url:
    print("ERROR: Provide the production DATABASE_URL as argument or PROD_DATABASE_URL env var")
    print("Example: python run_prod_migration.py 'postgresql://user:pass@host/dbname'")
    sys.exit(1)

# Fix legacy postgres:// scheme
if prod_db_url.startswith("postgres://"):
    prod_db_url = "postgresql://" + prod_db_url[len("postgres://"):]

print(f"Connecting to: {prod_db_url[:50]}...")

try:
    from sqlalchemy import create_engine, text
    engine = create_engine(prod_db_url)
    print("Connected.\n")
except Exception as e:
    print(f"Failed to connect: {e}")
    sys.exit(1)

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

with engine.connect() as conn:
    # Step 1: Check current enum values
    result = conn.execute(text(
        "SELECT enumlabel FROM pg_enum e "
        "JOIN pg_type t ON e.enumtypid = t.oid "
        "WHERE t.typname = 'simulation_type_enum' "
        "ORDER BY e.enumsortorder"
    ))
    current_values = [row[0] for row in result]
    print(f"Current simulation_type_enum values: {current_values}\n")

    # Step 2: Add missing values
    print("Adding missing simulation type enum values:")
    for val in NEW_SIM_TYPES:
        if val in current_values:
            print(f"  SKIP (exists): {val}")
        else:
            conn.execute(text(f"ALTER TYPE simulation_type_enum ADD VALUE '{val}'"))
            print(f"  ADDED: {val}")

    conn.commit()
    print()

    # Step 3: Check if class_level column exists in experiments
    result = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'experiments' AND column_name = 'class_level'"
    ))
    col_exists = result.fetchone() is not None

    if col_exists:
        print("class_level column: already exists in experiments table")
    else:
        conn.execute(text(
            "ALTER TABLE experiments ADD COLUMN class_level VARCHAR(50) NULL"
        ))
        conn.commit()
        print("class_level column: ADDED to experiments table")

    # Step 4: Check if alembic_version table exists and update it
    result = conn.execute(text(
        "SELECT EXISTS(SELECT FROM information_schema.tables WHERE table_name='alembic_version')"
    ))
    alembic_exists = result.scalar()

    if alembic_exists:
        result = conn.execute(text("SELECT version_num FROM alembic_version"))
        versions = [row[0] for row in result]
        print(f"\nAlembic version(s): {versions}")

        if 'a3f8c9d2e1b5' not in versions:
            # Insert new version
            conn.execute(text("UPDATE alembic_version SET version_num = 'a3f8c9d2e1b5'"))
            conn.commit()
            print("Updated alembic_version to a3f8c9d2e1b5")
        else:
            print("Alembic version already at a3f8c9d2e1b5")
    else:
        print("\nNote: alembic_version table not found (migration tracking may be elsewhere)")

    # Step 5: Final verification
    result = conn.execute(text(
        "SELECT enumlabel FROM pg_enum e "
        "JOIN pg_type t ON e.enumtypid = t.oid "
        "WHERE t.typname = 'simulation_type_enum' "
        "ORDER BY e.enumsortorder"
    ))
    final_values = [row[0] for row in result]
    print(f"\nFinal simulation_type_enum values: {final_values}")

print("\n=== Migration complete ===")
