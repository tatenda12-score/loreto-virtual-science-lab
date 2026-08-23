"""
scripts/seed.py
---------------
Database seed script for the Virtual Science Laboratory System.

Purpose
-------
Populates the database with presentation-ready demo data so the system
can be demonstrated immediately without manual data entry.

What it creates
---------------
  Users
    - 1 Admin       : admin@loreto.edu.ng
    - 1 Teacher     : teacher@loreto.edu.ng  (subject: Physics)
    - 3 Students    : student1..3@loreto.edu.ng  (classes: SS1, SS2, JSS3)

  Experiments
    1. Ohm's Law         (Physics   / Intermediate)
    2. Acid-Base Titration (Chemistry / Advanced)

  Submissions
    - Each student submits to Ohm's Law with realistic (slightly noisy) data
      so the auto-grading engine produces meaningful scores out-of-the-box.

Usage
-----
  From the backend/ directory:

      python -m scripts.seed

  Or directly:

      python scripts/seed.py

  The script is IDEMPOTENT — running it twice will skip records that
  already exist (matched by email / experiment title).
"""

from __future__ import annotations

import sys
import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure `backend/` is on sys.path so `app.*` imports resolve when this
# script is run from any working directory.
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent   # .../backend
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

# ---------------------------------------------------------------------------
# App imports (after path + env are configured)
# ---------------------------------------------------------------------------
from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.experiment import (
    Difficulty,
    Experiment,
    ExperimentStatus,
    SimulationType,
    Subject,
)
from app.models.submission import Submission, SubmissionStatus
from app.models.user import User, UserRole
from app.services.science_engine import grade_submission

# ---------------------------------------------------------------------------
# Default password for ALL seed users
# ---------------------------------------------------------------------------
DEFAULT_PASSWORD = "Demo123!"
HASHED_DEFAULT   = hash_password(DEFAULT_PASSWORD)

# ---------------------------------------------------------------------------
# Seed data definitions
# ---------------------------------------------------------------------------

SEED_USERS: list[dict] = [
    {
        "full_name":       "System Administrator",
        "email":           "admin@loreto.edu.ng",
        "hashed_password": HASHED_DEFAULT,
        "role":            UserRole.admin,
        "gender":          "Female",
    },
    {
        "full_name":       "Mr. Emeka Obi",
        "email":           "teacher@loreto.edu.ng",
        "hashed_password": HASHED_DEFAULT,
        "role":            UserRole.teacher,
        "subject_code":    "PHY301",
        "gender":          "Male",
    },
    {
        "full_name":       "Amaka Okonkwo",
        "email":           "student1@loreto.edu.ng",
        "hashed_password": HASHED_DEFAULT,
        "role":            UserRole.student,
        "class_level":     "SS2",
        "gender":          "Female",
    },
    {
        "full_name":       "Chidi Nwosu",
        "email":           "student2@loreto.edu.ng",
        "hashed_password": HASHED_DEFAULT,
        "role":            UserRole.student,
        "class_level":     "SS1",
        "gender":          "Male",
    },
    {
        "full_name":       "Ngozi Adeyemi",
        "email":           "student3@loreto.edu.ng",
        "hashed_password": HASHED_DEFAULT,
        "role":            UserRole.student,
        "class_level":     "JSS3",
        "gender":          "Female",
    },
]

# ---------------------------------------------------------------------------
# Experiment 1: Ohm's Law (Physics)
# The expected_values and tolerance drive the auto-grader.
# ---------------------------------------------------------------------------
OHM_PARAMETERS = {
    "voltage_V":      12.0,
    "resistance_ohm": 4.0,
    "expected_values": {
        "current_A": 3.0,    # I = V/R = 12/4
        "power_W":   36.0,   # P = V²/R = 144/4
    },
    "tolerance": 0.05,       # 5 % error allowed for full marks
}

OHM_INSTRUCTIONS = [
    {
        "step": 1,
        "action": "Connect the 12V power supply to the circuit board.",
        "hint": "Ensure the positive terminal is correctly aligned.",
    },
    {
        "step": 2,
        "action": "Insert the 4Ω resistor into the circuit.",
        "hint": "Use the colour-coded bands to verify resistance: Yellow–Violet–Black–Gold.",
    },
    {
        "step": 3,
        "action": "Switch on the power supply and read the ammeter.",
        "hint": "Expected current ≈ 3 A.",
    },
    {
        "step": 4,
        "action": "Calculate power using P = V × I and record your result.",
        "hint": "Expected power ≈ 36 W.",
    },
    {
        "step": 5,
        "action": "Record both current_A and power_W in your submission.",
    },
]

# ---------------------------------------------------------------------------
# Experiment 2: Acid-Base Titration (Chemistry)
# ---------------------------------------------------------------------------
TITRATION_PARAMETERS = {
    "volume_acid_ml":  25.0,
    "molarity_acid":   0.1,
    "expected_values": {
        "molarity_base": 0.1,   # 1:1 stoichiometry → equal molarities
        "moles_acid":    0.0025,
    },
    "tolerance": 0.05,
}

TITRATION_INSTRUCTIONS = [
    {
        "step": 1,
        "action": "Fill the burette with 0.1 M NaOH solution and record the initial volume.",
    },
    {
        "step": 2,
        "action": "Pipette exactly 25.0 mL of 0.1 M HCl into a conical flask.",
        "hint": "Add 2–3 drops of phenolphthalein indicator.",
    },
    {
        "step": 3,
        "action": "Titrate by adding NaOH dropwise until a faint pink colour persists for 30 seconds.",
        "hint": "Approach the endpoint slowly — add half-drops near the end.",
    },
    {
        "step": 4,
        "action": "Record the final burette reading and calculate the volume of NaOH used.",
    },
    {
        "step": 5,
        "action": "Calculate molarity_base = (volume_acid_ml × molarity_acid) / volume_base_ml.",
        "hint": "Expected ≈ 0.1 mol/L",
    },
    {
        "step": 6,
        "action": "Enter molarity_base and moles_acid in your submission.",
    },
]

SEED_EXPERIMENTS: list[dict] = [
    {
        "title":           "Ohm's Law — Voltage, Current & Power",
        "subject":         Subject.physics,
        "difficulty":      Difficulty.intermediate,
        "simulation_type": SimulationType.ohms_law,
        "status":          ExperimentStatus.published,
        "topic":           "Current Electricity & Resistance",
        "description": (
            "Students verify Ohm's Law (V = IR) by building a simple resistive "
            "circuit, measuring current with an ammeter, and computing electrical "
            "power. Results are compared against the theoretical values for a "
            "12 V source and 4 Ω resistor."
        ),
        "materials": [
            "12V DC Power Supply",
            "4Ω Fixed Resistor",
            "Digital Multimeter / Ammeter",
            "Insulated Connecting Wires",
        ],
        "instructions":    OHM_INSTRUCTIONS,
        "parameters":      OHM_PARAMETERS,
    },
    {
        "title":           "Acid-Base Titration — Determining NaOH Concentration",
        "subject":         Subject.chemistry,
        "difficulty":      Difficulty.advanced,
        "simulation_type": SimulationType.titration,
        "status":          ExperimentStatus.published,
        "topic":           "Acids, Bases & Neutralisation",
        "description": (
            "Students use a standard HCl solution to determine the unknown "
            "concentration of a NaOH solution via acid-base neutralisation. "
            "Phenolphthalein is used as the visual indicator."
        ),
        "materials": [
            "50 mL Burette with stand & clamp",
            "25 mL Volumetric Pipette & filler",
            "250 mL Conical Flask",
            "0.1 M Hydrochloric Acid (HCl)",
            "Sodium Hydroxide (NaOH) Solution",
            "Phenolphthalein Indicator Solution",
        ],
        "instructions":    TITRATION_INSTRUCTIONS,
        "parameters":      TITRATION_PARAMETERS,
    },
]

# ---------------------------------------------------------------------------
# Sample student observations (slightly noisy for realistic scoring)
# ---------------------------------------------------------------------------
STUDENT_OBSERVATIONS = [
    # Amaka — very accurate (~1.7 % error on current)
    {"current_A": 3.05,  "power_W": 36.2},
    # Chidi — moderate accuracy (~3.3 % error)
    {"current_A": 2.90,  "power_W": 35.0},
    # Ngozi — borderline accuracy (~4.8 % error)
    {"current_A": 2.857, "power_W": 34.3},
]


# ===========================================================================
# Seeder functions
# ===========================================================================

def _upsert_users(db) -> dict[str, User]:
    """Create users that don't already exist. Returns email→User map."""
    created: dict[str, User] = {}
    for data in SEED_USERS:
        existing = db.query(User).filter(User.email == data["email"]).first()
        if existing:
            print(f"  [SKIP] User already exists: {data['email']}")
            created[data["email"]] = existing
        else:
            user = User(**data, is_active=True, is_verified=True)
            db.add(user)
            db.flush()
            print(f"  [OK]   Created user: {data['email']}  (role={data['role'].value})")
            created[data["email"]] = user
    return created


def _upsert_experiments(db, teacher: User) -> list[Experiment]:
    """Create experiments that don't already exist. Returns list of Experiment objects."""
    experiments: list[Experiment] = []
    for data in SEED_EXPERIMENTS:
        existing = (
            db.query(Experiment).filter(Experiment.title == data["title"]).first()
        )
        if existing:
            print(f"  [SKIP] Experiment already exists: '{data['title']}'")
            experiments.append(existing)
        else:
            exp = Experiment(**data, created_by=teacher.id)
            db.add(exp)
            db.flush()
            print(f"  [OK]   Created experiment: '{data['title']}'")
            experiments.append(exp)
    return experiments


def _seed_submissions(
    db,
    students: list[User],
    ohm_experiment: Experiment,
) -> None:
    """Create one Ohm's Law submission per student (if not already present)."""
    for student, observations in zip(students, STUDENT_OBSERVATIONS):
        existing = (
            db.query(Submission)
            .filter(
                Submission.student_id == student.id,
                Submission.experiment_id == ohm_experiment.id,
            )
            .first()
        )
        if existing:
            print(f"  [SKIP] Submission already exists: student={student.email}")
            continue

        score = grade_submission(
            experiment_parameters=ohm_experiment.parameters,
            recorded_observations=observations,
        )
        from datetime import datetime, timezone
        sub = Submission(
            student_id=student.id,
            experiment_id=ohm_experiment.id,
            recorded_observations=observations,
            calculated_score=score,
            status=SubmissionStatus.submitted,
            submitted_at=datetime.now(timezone.utc),
        )
        db.add(sub)
        db.flush()
        print(
            f"  [OK]   Submission: student={student.email}  "
            f"score={score}  observations={observations}"
        )


# ===========================================================================
# Entry point
# ===========================================================================

def run_seed() -> None:
    print("\n========================================")
    print(" Virtual Science Lab — Database Seeder ")
    print("========================================\n")

    db = SessionLocal()
    try:
        print("[1/3] Seeding users ...")
        users = _upsert_users(db)

        teacher  = users["teacher@loreto.edu.ng"]
        students = [
            users["student1@loreto.edu.ng"],
            users["student2@loreto.edu.ng"],
            users["student3@loreto.edu.ng"],
        ]

        print("\n[2/3] Seeding experiments ...")
        experiments = _upsert_experiments(db, teacher)
        ohm_experiment = experiments[0]   # Ohm's Law is always first

        print("\n[3/3] Seeding submissions ...")
        _seed_submissions(db, students, ohm_experiment)

        db.commit()
        print("\n[DONE] Seed completed successfully.")
        print(f"       Default password for ALL users: {DEFAULT_PASSWORD}")
        print("========================================\n")

    except Exception as exc:
        db.rollback()
        print(f"\n[ERROR] Seeding failed — rolling back.\n  {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
