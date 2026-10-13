"""
app/services/science_engine/__init__.py
-----------------------------------------
Modular simulation and auto-grading engine.
"""

from .grading import (
    evaluate_submission,
    grade_submission,
    grade_dynamic_ohms_law,
    grade_dynamic_velocity,
    grade_dynamic_titration,
    grade_dynamic_ph,
    grade_dynamic_moments,
)
from .ohms_law import calculate_ohms_law
from .velocity import calculate_velocity
from .titration import calculate_titration
from .ph import calculate_ph

__all__ = [
    "evaluate_submission",
    "grade_submission",
    "grade_dynamic_ohms_law",
    "grade_dynamic_velocity",
    "grade_dynamic_titration",
    "grade_dynamic_ph",
    "grade_dynamic_moments",
    "calculate_ohms_law",
    "calculate_velocity",
    "calculate_titration",
    "calculate_ph",
]
