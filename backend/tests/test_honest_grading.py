"""
backend/tests/test_honest_grading.py
------------------------------------
Tests ensuring honest marking and strict auto-grading.
Validates that false, inaccurate, or fabricated student inputs receive 0% (or clamped low scores),
while honest, scientifically accurate measurements receive appropriate credit.
"""
import pytest
from app.services.science_engine.grading import (
    evaluate_submission,
    grade_submission,
    grade_dynamic_ohms_law,
    grade_dynamic_velocity,
    grade_dynamic_titration,
    grade_dynamic_ph,
    grade_dynamic_moments,
    grade_qualitative_observation,
)

def test_young_modulus_false_information_gets_zero():
    """Young Modulus: Expected 120 GPa, tolerance 15 GPa absolute."""
    # Wildly false value (300 GPa)
    score_false = evaluate_submission(expected_val=120.0, student_val=300.0, tolerance=15.0)
    assert score_false == 0.0

    # Mildly out of tolerance (140 GPa -> 20 GPa error > 15 GPa)
    score_out = evaluate_submission(expected_val=120.0, student_val=140.0, tolerance=15.0)
    assert score_out == 0.0

    # Accurate value (125 GPa -> 5 GPa error <= 15 GPa)
    score_close = evaluate_submission(expected_val=120.0, student_val=125.0, tolerance=15.0)
    assert score_close == 66.67

    # Exact value (120 GPa)
    score_exact = evaluate_submission(expected_val=120.0, student_val=120.0, tolerance=15.0)
    assert score_exact == 100.0


def test_enzyme_activity_false_information_gets_zero():
    """Enzyme Activity: Expected 37.0 °C, tolerance 2.0 °C absolute."""
    # False values (20 °C, 50 °C, 60 °C)
    assert evaluate_submission(expected_val=37.0, student_val=20.0, tolerance=2.0) == 0.0
    assert evaluate_submission(expected_val=37.0, student_val=50.0, tolerance=2.0) == 0.0
    assert evaluate_submission(expected_val=37.0, student_val=60.0, tolerance=2.0) == 0.0

    # Near tolerance (38.0 °C -> 1 °C error)
    assert evaluate_submission(expected_val=37.0, student_val=38.0, tolerance=2.0) == 50.0

    # Exact match (37.0 °C)
    assert evaluate_submission(expected_val=37.0, student_val=37.0, tolerance=2.0) == 100.0


def test_chemical_kinetics_false_information_gets_zero():
    """Chemical Kinetics: Expected 50 kJ/mol, tolerance 5 kJ/mol absolute."""
    assert evaluate_submission(expected_val=50.0, student_val=100.0, tolerance=5.0) == 0.0
    assert evaluate_submission(expected_val=50.0, student_val=150.0, tolerance=5.0) == 0.0
    assert evaluate_submission(expected_val=50.0, student_val=52.5, tolerance=5.0) == 50.0
    assert evaluate_submission(expected_val=50.0, student_val=50.0, tolerance=5.0) == 100.0


def test_photosynthesis_false_information_gets_zero():
    """Photosynthesis: Expected 10.0, tolerance 2.0 absolute."""
    assert evaluate_submission(expected_val=10.0, student_val=20.0, tolerance=2.0) == 0.0
    assert evaluate_submission(expected_val=10.0, student_val=15.0, tolerance=2.0) == 0.0
    assert evaluate_submission(expected_val=10.0, student_val=11.0, tolerance=2.0) == 50.0
    assert evaluate_submission(expected_val=10.0, student_val=10.0, tolerance=2.0) == 100.0


def test_dynamic_titration_auto_grading():
    """Acid-Base Titration: M1*V1 = M2*V2 -> (0.1 * 20) / 25 = 0.08 M."""
    obs_correct = {
        "volume_acid_ml": 20.0,
        "molarity_acid": 0.1,
        "volume_base_ml": 25.0,
        "molarity_base": 0.08,
    }
    assert grade_dynamic_titration(obs_correct, tolerance=0.05) == 100.0

    # False molarity (0.50 M)
    obs_false = {
        "volume_acid_ml": 20.0,
        "molarity_acid": 0.1,
        "volume_base_ml": 25.0,
        "molarity_base": 0.50,
    }
    assert grade_dynamic_titration(obs_false, tolerance=0.05) == 0.0


def test_dynamic_ph_auto_grading():
    """pH = -log10([H+]). [H+] = 1e-7 -> pH = 7.0."""
    obs_correct = {"hydrogen_ion_concentration": 1e-7, "ph": 7.0}
    assert grade_dynamic_ph(obs_correct, tolerance=0.1) == 100.0

    # False pH (3.0 for neutral solution)
    obs_false = {"hydrogen_ion_concentration": 1e-7, "ph": 3.0}
    assert grade_dynamic_ph(obs_false, tolerance=0.1) == 0.0


def test_dynamic_velocity_auto_grading():
    """v = d / t -> 100 / 10 = 10 m/s."""
    obs_correct = {"distance_m": 100.0, "time_s": 10.0, "velocity_ms": 10.0}
    assert grade_dynamic_velocity(obs_correct, tolerance=0.05) == 100.0

    # False velocity (50 m/s)
    obs_false = {"distance_m": 100.0, "time_s": 10.0, "velocity_ms": 50.0}
    assert grade_dynamic_velocity(obs_false, tolerance=0.05) == 0.0

    # Negative / zero velocity
    obs_neg = {"distance_m": 100.0, "time_s": 10.0, "velocity_ms": -10.0}
    assert grade_dynamic_velocity(obs_neg, tolerance=0.05) == 0.0


def test_dynamic_ohms_law_false_inputs():
    """Ohm's Law: 12V / 4Ω = 3A, 36W."""
    # False current (10A)
    obs_false = {
        "voltage_V": 12.0,
        "resistance_ohm": 4.0,
        "current_A": 10.0,
        "power_W": 120.0,
    }
    assert grade_dynamic_ohms_law(obs_false, tolerance=0.05) == 0.0

    # Negative current
    obs_neg = {
        "voltage_V": 12.0,
        "resistance_ohm": 4.0,
        "current_A": -3.0,
        "power_W": -36.0,
    }
    assert grade_dynamic_ohms_law(obs_neg, tolerance=0.05) == 0.0


def test_qualitative_food_tests_honest_marking():
    """Qualitative grading: accepts genuine observations, strictly rejects false ones."""
    # Potato + Iodine: expected 'Blue-black colour'
    assert grade_qualitative_observation("Blue-black colour", "blue-black") == 100.0
    assert grade_qualitative_observation("Blue-black colour", "dark blue") == 100.0
    assert grade_qualitative_observation("Blue-black colour", "red colour") == 0.0
    assert grade_qualitative_observation("Blue-black colour", "yellow") == 0.0

    # Conclusion: expected 'Starch present'
    assert grade_qualitative_observation("Starch present", "starch present") == 100.0
    assert grade_qualitative_observation("Starch present", "starch") == 100.0
    assert grade_qualitative_observation("Starch present", "no starch") == 0.0
    assert grade_qualitative_observation("Starch present", "protein present") == 0.0
    assert grade_qualitative_observation("Starch present", "glucose") == 0.0
