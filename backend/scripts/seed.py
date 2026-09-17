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
    - 3 Students    : student1..3@loreto.edu.ng  (classes: Form4, L6, Form3)

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
        "class_level":     "L6",
        "gender":          "Female",
    },
    {
        "full_name":       "Chidi Nwosu",
        "email":           "student2@loreto.edu.ng",
        "hashed_password": HASHED_DEFAULT,
        "role":            UserRole.student,
        "class_level":     "Form4",
        "gender":          "Male",
    },
    {
        "full_name":       "Ngozi Adeyemi",
        "email":           "student3@loreto.edu.ng",
        "hashed_password": HASHED_DEFAULT,
        "role":            UserRole.student,
        "class_level":     "Form3",
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
        "class_level":     "Form4",
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
        "class_level":     "Form4",
    },
    {
        "title":           "Food Tests",
        "subject":         Subject.biology,
        "difficulty":      Difficulty.beginner,
        "simulation_type": SimulationType.food_tests,
        "status":          ExperimentStatus.published,
        "topic":           "Nutrition",
        "description": "Test different food samples for Starch, Reducing sugars, Protein, and Lipids.",
        "materials": ["Test tubes", "Iodine solution", "Benedict's solution", "Biuret reagent", "Ethanol"],
        "instructions": [
            {"step": 1, "action": "Select a food sample and place it in the test tube."},
            {"step": 2, "action": "Select the appropriate reagent for the test."},
            {"step": 3, "action": "Observe the colour change and record your observations."},
        ],
        "parameters": {
            "expected_values": {
                "potato_iodine_observation": "Blue-black colour",
                "potato_iodine_conclusion": "Starch present",
                "egg_biuret_observation": "Purple colour",
                "egg_biuret_conclusion": "Protein present",
            },
            "tolerance": 0.0,
        },
        "class_level": "Form3",
    },
    {
        "title":           "Separation of a Mixture - Sand, Salt and Water",
        "subject":         Subject.chemistry,
        "difficulty":      Difficulty.intermediate,
        "simulation_type": SimulationType.separation,
        "status":          ExperimentStatus.published,
        "topic":           "Separation Techniques",
        "description": "Determine and perform the correct sequence of laboratory separation techniques for a mixture.",
        "materials": ["Filter funnel", "Filter paper", "Evaporating basin", "Bunsen burner", "Beaker"],
        "instructions": [
            {"step": 1, "action": "Set up the filtration apparatus using filter paper and funnel."},
            {"step": 2, "action": "Pour the mixture through the filter paper to separate the sand."},
            {"step": 3, "action": "Transfer the filtrate to an evaporating basin."},
            {"step": 4, "action": "Heat the filtrate until the water evaporates to recover the salt."},
        ],
        "parameters": {
            "expected_values": {
                "sand_separation_method": "Filtration",
                "salt_separation_method": "Evaporation",
            },
            "tolerance": 0.0,
        },
        "class_level": "Form3",
    },
    {
        "title":           "Principle of Moments",
        "subject":         Subject.physics,
        "difficulty":      Difficulty.intermediate,
        "simulation_type": SimulationType.moments,
        "status":          ExperimentStatus.published,
        "topic":           "Forces and Motion",
        "description": "Investigate the principle of moments using a metre rule and slotted masses.",
        "materials": ["Metre rule", "Pivot/knife edge", "Mass hangers", "Slotted masses"],
        "instructions": [
            {"step": 1, "action": "Drag weights onto the metre rule at different distances."},
            {"step": 2, "action": "Calculate the moment for each configuration (Force x Distance)."},
            {"step": 3, "action": "Record the calculated moments for each trial."},
        ],
        "parameters": {
            "expected_values": {
                "trial1_moment": 0.40,
                "trial2_moment": 0.60,
            },
            "tolerance": 0.05,
        },
        "class_level": "Form3",
    },
    {
        "title":           "Enzyme Activity — Investigating Factors Affecting Enzyme Action",
        "subject":         Subject.biology,
        "difficulty":      Difficulty.advanced,
        "simulation_type": SimulationType.enzyme_activity,
        "status":          ExperimentStatus.published,
        "topic":           "Enzymes",
        "description": "Investigate how variables such as temperature affect the rate of amylase activity on starch.",
        "materials": ["Test tubes", "Water baths", "Thermometer", "Stopwatch", "Starch solution", "Amylase", "Iodine"],
        "instructions": [
            {"step": 1, "action": "Set the water bath to the desired temperature."},
            {"step": 2, "action": "Mix amylase and starch, and start the timer."},
            {"step": 3, "action": "Take samples at regular intervals and test with iodine."},
            {"step": 4, "action": "Record the time taken for the starch to be completely broken down."}
        ],
        "parameters": {
            "expected_values": {
                "optimum_temp": 37.0
            },
            "tolerance": 2.0
        },
        "class_level": "L6",
    },
    {
        "title":           "Quantitative Acid–Base Titration — Determination of an Unknown Concentration",
        "subject":         Subject.chemistry,
        "difficulty":      Difficulty.advanced,
        "simulation_type": SimulationType.l6_titration,
        "status":          ExperimentStatus.published,
        "topic":           "Quantitative Analysis",
        "description": "Perform a quantitative acid-base titration to determine the concentration of an unknown solution. Record rough and accurate titres.",
        "materials": ["Burette", "Pipette", "Conical flask", "Acid solution", "Alkali solution", "Indicator", "White tile"],
        "instructions": [
            {"step": 1, "action": "Perform a rough titration to find the approximate endpoint."},
            {"step": 2, "action": "Perform accurate titrations dropwise near the endpoint."},
            {"step": 3, "action": "Identify concordant results (within 0.10 cm³)."},
            {"step": 4, "action": "Calculate the mean titre and determine the unknown concentration."}
        ],
        "parameters": {
            "expected_values": {
                "mean_titre_cm3": 25.0
            },
            "tolerance": 0.2
        },
        "class_level": "L6",
    },
    {
        "title":           "Internal Resistance of a Cell",
        "subject":         Subject.physics,
        "difficulty":      Difficulty.advanced,
        "simulation_type": SimulationType.internal_resistance,
        "status":          ExperimentStatus.published,
        "topic":           "Current Electricity",
        "description": "Investigate the relationship between terminal potential difference and current to determine the internal resistance and EMF of a cell.",
        "materials": ["Cell", "Ammeter", "Voltmeter", "Variable resistor", "Switch", "Connecting wires"],
        "instructions": [
            {"step": 1, "action": "Construct a circuit with the cell, variable resistor, and switch in series."},
            {"step": 2, "action": "Connect the voltmeter in parallel across the cell."},
            {"step": 3, "action": "Vary the external resistance and record pairs of V and I."},
            {"step": 4, "action": "Plot V against I to find EMF (intercept) and internal resistance (negative gradient)."}
        ],
        "parameters": {
            "expected_values": {
                "emf_V": 1.5,
                "internal_resistance_ohm": 0.5
            },
            "tolerance": 0.1
        },
        "class_level": "L6",
    },
    {
        "title":           "Investigating the Rate of Photosynthesis and Limiting Factors",
        "subject":         Subject.biology,
        "difficulty":      Difficulty.advanced,
        "simulation_type": SimulationType.u6_photosynthesis,
        "status":          ExperimentStatus.published,
        "topic":           "Photosynthesis",
        "description": "Create an advanced Upper 6 biology practical investigating factors affecting the rate of photosynthesis. Measure oxygen production as an indicator of photosynthetic rate.",
        "materials": ["Aquatic plant", "Transparent container", "Lamp", "Thermometer", "Stopwatch", "NaHCO3 solution", "Gas syringe"],
        "instructions": [
            {"step": 1, "action": "Select the independent variable (Light, CO2, Temp)."},
            {"step": 2, "action": "Control the other variables."},
            {"step": 3, "action": "Measure the rate of oxygen production over time."},
            {"step": 4, "action": "Plot a graph and identify the limiting factor plateau."}
        ],
        "parameters": {
            "expected_values": {
                "plateau_rate": 10.0
            },
            "tolerance": 2.0
        },
        "class_level": "Upper6",
    },
    {
        "title":           "Chemical Kinetics and Determination of Activation Energy",
        "subject":         Subject.chemistry,
        "difficulty":      Difficulty.advanced,
        "simulation_type": SimulationType.u6_kinetics,
        "status":          ExperimentStatus.published,
        "topic":           "Chemical Kinetics",
        "description": "Determine activation energy by investigating how reaction rate changes with temperature.",
        "materials": ["Reaction vessel", "Pipette", "Thermometer", "Stopwatch", "Water bath", "Reactants"],
        "instructions": [
            {"step": 1, "action": "Perform the reaction at several different temperatures."},
            {"step": 2, "action": "Record the time taken for the reaction to complete."},
            {"step": 3, "action": "Calculate rate, 1/T (Kelvin), and ln(k)."},
            {"step": 4, "action": "Plot an Arrhenius graph to determine activation energy from the gradient."}
        ],
        "parameters": {
            "expected_values": {
                "activation_energy_kj_mol": 50.0
            },
            "tolerance": 5.0
        },
        "class_level": "Upper6",
    },
    {
        "title":           "Young Modulus and Elastic Behaviour of a Wire",
        "subject":         Subject.physics,
        "difficulty":      Difficulty.advanced,
        "simulation_type": SimulationType.u6_young_modulus,
        "status":          ExperimentStatus.published,
        "topic":           "Materials",
        "description": "Investigate the relationship between force and extension and determine Young modulus.",
        "materials": ["Wire specimen", "Micrometer", "Mass hanger", "Slotted masses", "Vernier scale"],
        "instructions": [
            {"step": 1, "action": "Measure the diameter of the wire using a micrometer."},
            {"step": 2, "action": "Add slotted masses and record the extension."},
            {"step": 3, "action": "Calculate Stress and Strain."},
            {"step": 4, "action": "Plot a Force-Extension graph and determine Young Modulus."}
        ],
        "parameters": {
            "expected_values": {
                "young_modulus_gpa": 120.0
            },
            "tolerance": 15.0
        },
        "class_level": "Upper6",
    }
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
            # Ensure the password hash matches Demo123! in case it was created with an old hash
            existing.hashed_password = hash_password(DEFAULT_PASSWORD)
            existing.is_active = True
            db.flush()
            print(f"  [OK]   Synchronized user: {data['email']}")
            created[data["email"]] = existing
        else:
            user = User(
                full_name=data["full_name"],
                email=data["email"],
                hashed_password=hash_password(DEFAULT_PASSWORD),
                role=data["role"],
                subject_code=data.get("subject_code"),
                class_level=data.get("class_level"),
                gender=data.get("gender"),
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            db.flush()
            print(f"  [OK]   Created user: {data['email']}  (role={data['role'].value})")
            created[data["email"]] = user
    return created


def _upsert_experiments(db, teacher: User) -> list[Experiment]:
    """
    Create or reconcile experiments against the canonical seed definition.

    For NEW experiments: creates the full record.

    For EXISTING experiments (matched by title): reconciles the following
    canonical configuration fields to match the seed definition:
      - class_level       (the level filter — the key field for access control)
      - status            (published/draft/archived)
      - simulation_type   (which interactive component to render)
      - subject           (Physics / Chemistry / Biology)
      - difficulty        (Beginner / Intermediate / Advanced)
      - topic             (curriculum topic label)
      - description       (overview paragraph)
      - materials         (apparatus list)
      - instructions      (step-by-step list)
      - parameters        (grading constants and expected values)

    Fields deliberately NOT updated (user-generated / relational data):
      - id                (primary key — never changed)
      - created_by        (original author — preserved)
      - created_at        (original timestamp — preserved)
      - submissions       (student work — never overwritten)

    Returns list of Experiment objects.
    """
    # Canonical fields to reconcile on existing records.
    CANONICAL_FIELDS = (
        "class_level",
        "status",
        "simulation_type",
        "subject",
        "difficulty",
        "topic",
        "description",
        "materials",
        "instructions",
        "parameters",
    )

    experiments: list[Experiment] = []
    for data in SEED_EXPERIMENTS:
        existing = (
            db.query(Experiment).filter(Experiment.title == data["title"]).first()
        )
        if existing:
            # Reconcile canonical fields — detect and report any differences.
            changed_fields: list[str] = []
            for field in CANONICAL_FIELDS:
                seed_val = data.get(field)
                current_val = getattr(existing, field, None)
                if current_val != seed_val:
                    setattr(existing, field, seed_val)
                    changed_fields.append(f"{field}: {current_val!r} -> {seed_val!r}")

            if changed_fields:
                db.flush()
                print(
                    f"  [FIX]  Reconciled experiment '{data['title']}': "
                    + ", ".join(changed_fields)
                )
            else:
                print(f"  [OK]   Experiment already canonical: '{data['title']}'")
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
            automatic_score=score,
            status=SubmissionStatus.graded,
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
    from app.core.config import settings
    if settings.APP_ENV.lower() == "production":
        raise RuntimeError("Seed script is disabled in production to prevent overwriting or creating demo data.")

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
