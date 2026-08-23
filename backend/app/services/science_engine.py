"""
app/services/science_engine.py
-------------------------------
Modular simulation and auto-grading engine for the Virtual Science Lab.

Design philosophy
-----------------
  - Pure functions only — no DB access, no FastAPI imports.
  - Each physics/chemistry function returns a structured dict so the
    calling endpoint can store the result in `recorded_observations`
    or use it for scoring without additional parsing.
  - The scoring function is intentionally generic: it takes *any*
    expected vs. student value pair plus a tolerance, enabling it to
    grade any single numeric measurement across subjects.

Extending the engine
--------------------
  Add a new experiment type by:
    1. Writing a ``calculate_<name>(...)`` function returning a dict.
    2. Registering the expected keys in the experiment's ``parameters``
       JSONB column when you create the experiment via the API.
    3. Calling ``evaluate_submission`` once per graded field and
       averaging the results (see ``grade_submission`` below).
"""

from __future__ import annotations

import math
from typing import Any


# ===========================================================================
# Physics Simulations
# ===========================================================================

def calculate_ohms_law(voltage: float, resistance: float) -> dict[str, float]:
    """
    Compute theoretical current and power for a resistive circuit.

    Parameters
    ----------
    voltage : float
        Applied EMF in Volts (V).  Must be > 0.
    resistance : float
        Resistance in Ohms (Ω).  Must be > 0 to avoid division by zero.

    Returns
    -------
    dict with keys:
        current_A  — Current in Amperes  (I = V / R)
        power_W    — Power in Watts      (P = V²/ R  or  P = V × I)
        voltage_V  — Echo of the input voltage (convenience field)
        resistance_ohm — Echo of input resistance

    Raises
    ------
    ValueError  if voltage or resistance ≤ 0.

    Example
    -------
        >>> calculate_ohms_law(12.0, 4.0)
        {'current_A': 3.0, 'power_W': 36.0, 'voltage_V': 12.0, 'resistance_ohm': 4.0}
    """
    if voltage <= 0:
        raise ValueError(f"voltage must be > 0, got {voltage}")
    if resistance <= 0:
        raise ValueError(f"resistance must be > 0, got {resistance}")

    current = round(voltage / resistance, 6)
    power   = round(voltage ** 2 / resistance, 6)

    return {
        "current_A":      current,
        "power_W":        power,
        "voltage_V":      voltage,
        "resistance_ohm": resistance,
    }


def calculate_velocity(distance_m: float, time_s: float) -> dict[str, float]:
    """
    Compute average velocity and kinetic energy (assuming unit mass).

    Parameters
    ----------
    distance_m : float  Distance in metres (must be > 0).
    time_s     : float  Time in seconds    (must be > 0).

    Returns
    -------
    dict with keys:  velocity_ms, distance_m, time_s
    """
    if distance_m <= 0:
        raise ValueError(f"distance_m must be > 0, got {distance_m}")
    if time_s <= 0:
        raise ValueError(f"time_s must be > 0, got {time_s}")

    velocity = round(distance_m / time_s, 6)
    return {
        "velocity_ms": velocity,
        "distance_m":  distance_m,
        "time_s":      time_s,
    }


# ===========================================================================
# Chemistry Simulations
# ===========================================================================

def calculate_titration(
    volume_acid_ml:   float,
    molarity_acid:    float,
    volume_base_ml:   float,
) -> dict[str, float]:
    """
    Calculate the molarity of the base using acid-base titration stoichiometry
    (assumes 1:1 molar ratio, e.g. HCl + NaOH → NaCl + H₂O).

    Parameters
    ----------
    volume_acid_ml  : float  Volume of acid added in millilitres.
    molarity_acid   : float  Known molarity of the acid (mol/L).
    volume_base_ml  : float  Volume of base used at equivalence point (mL).

    Returns
    -------
    dict with keys:
        moles_acid        — Moles of acid used
        molarity_base     — Calculated molarity of the base solution
        equivalence_ratio — Moles acid / moles base (should ≈ 1 for 1:1)

    Raises
    ------
    ValueError  if any argument ≤ 0.
    """
    for name, val in [
        ("volume_acid_ml", volume_acid_ml),
        ("molarity_acid",  molarity_acid),
        ("volume_base_ml", volume_base_ml),
    ]:
        if val <= 0:
            raise ValueError(f"{name} must be > 0, got {val}")

    moles_acid    = round((volume_acid_ml / 1000) * molarity_acid, 8)
    molarity_base = round(moles_acid / (volume_base_ml / 1000), 6)

    return {
        "moles_acid":        moles_acid,
        "molarity_base":     molarity_base,
        "volume_acid_ml":    volume_acid_ml,
        "volume_base_ml":    volume_base_ml,
        "equivalence_ratio": round(moles_acid / (molarity_base * volume_base_ml / 1000), 4),
    }


def calculate_ph(hydrogen_ion_concentration: float) -> dict[str, float]:
    """
    Calculate pH from [H⁺] concentration.

    Parameters
    ----------
    hydrogen_ion_concentration : float
        Concentration of H⁺ in mol/L.  Must be > 0.

    Returns
    -------
    dict with keys:  ph, hydrogen_ion_concentration
    """
    if hydrogen_ion_concentration <= 0:
        raise ValueError(
            f"hydrogen_ion_concentration must be > 0, got {hydrogen_ion_concentration}"
        )
    ph = round(-math.log10(hydrogen_ion_concentration), 4)
    return {
        "ph":                          ph,
        "hydrogen_ion_concentration":  hydrogen_ion_concentration,
    }


# ===========================================================================
# Scoring / Grading
# ===========================================================================

def evaluate_submission(
    expected_val: float,
    student_val:  float,
    tolerance:    float = 0.05,
) -> float:
    """
    Score a single student measurement against the theoretical (expected) value.

    Scoring model
    -------------
    1. When expected_val != 0:
       Uses *percentage error* relative to the expected value:
           pct_error = |student_val - expected_val| / |expected_val|
       Score decays linearly from 100 down to 0 as pct_error rises
       from 0 to tolerance. Any error beyond tolerance scores 0.

    2. When expected_val == 0:
       Uses *absolute error* relative to tolerance:
           abs_error = |student_val - 0|
       Score decays linearly from 100 down to 0 as abs_error rises
       from 0 to tolerance. Any error beyond tolerance scores 0.

    Parameters
    ----------
    expected_val : float
        The theoretically correct value.
    student_val  : float
        The value recorded by the student.
    tolerance    : float
        Maximum acceptable error threshold. Defaults to 0.05.

    Returns
    -------
    float
        Score in the range [0.0, 100.0], rounded to 2 decimal places.

    Raises
    ------
    ValueError
        If tolerance <= 0.
    """
    if tolerance <= 0:
        raise ValueError(f"tolerance must be > 0, got {tolerance}")

    if expected_val == 0.0:
        abs_error = abs(student_val)
        raw_score = max(0.0, 1.0 - (abs_error / tolerance)) * 100.0
        return round(raw_score, 2)

    pct_error = abs(student_val - expected_val) / abs(expected_val)
    raw_score = max(0.0, 1.0 - (pct_error / tolerance)) * 100.0
    return round(raw_score, 2)


def grade_dynamic_ohms_law(
    recorded_observations: dict[str, Any],
    tolerance: float = 0.05,
) -> float:
    """
    Dynamically grade an Ohm's Law submission using trial variables.

    Authoritatively calculates theoretical current (I = V / R) and
    power (P = V * I) from submitted voltage and resistance inputs.
    """
    try:
        raw_v = recorded_observations.get("voltage_V")
        raw_r = recorded_observations.get("resistance_ohm")

        if raw_v is None or raw_r is None:
            return 0.0

        voltage = float(raw_v)
        resistance = float(raw_r)

        # Physical safety checks: V > 0 and R > 0
        if voltage <= 0 or voltage > 1000:
            return 0.0
        if resistance <= 0 or resistance > 1_000_000:
            return 0.0

        expected_current = round(voltage / resistance, 6)
        expected_power = round(voltage * expected_current, 6)

        expected_values = {
            "current_A": expected_current,
            "power_W": expected_power,
        }

        scores: list[float] = []
        for field, expected in expected_values.items():
            student_val = recorded_observations.get(field)
            if student_val is None:
                scores.append(0.0)
            else:
                try:
                    score = evaluate_submission(
                        expected_val=float(expected),
                        student_val=float(student_val),
                        tolerance=tolerance,
                    )
                    scores.append(score)
                except (ValueError, TypeError):
                    scores.append(0.0)

        return round(sum(scores) / len(expected_values), 2) if expected_values else 0.0

    except (ValueError, TypeError):
        return 0.0


def grade_submission(
    experiment_parameters: dict[str, Any],
    recorded_observations: dict[str, Any],
) -> float:
    """
    Grade a full submission across all required expected fields.

    - Supports dynamic simulation grading for Ohm's Law trials.
    - Missing required fields strictly receive 0.0 points and contribute to the average.
    - Returns 0.0 if no observations or no expected fields are defined.
    """
    if not recorded_observations:
        return 0.0

    tolerance: float = float(experiment_parameters.get("tolerance", 0.05))

    # Dynamic Ohm's Law grading if trial parameters are provided
    if (
        "voltage_V" in recorded_observations
        and "resistance_ohm" in recorded_observations
        and (
            experiment_parameters.get("simulation_type") == "ohms_law"
            or "current_A" in experiment_parameters.get("expected_values", {})
            or "voltage_V" in experiment_parameters
        )
    ):
        return grade_dynamic_ohms_law(recorded_observations, tolerance=tolerance)

    expected_values: dict = experiment_parameters.get("expected_values", {})
    if not expected_values:
        return 0.0

    scores: list[float] = []
    for field, expected in expected_values.items():
        student_val = recorded_observations.get(field)
        if student_val is None:
            # Missing observation is strictly penalized
            scores.append(0.0)
        else:
            try:
                score = evaluate_submission(
                    expected_val=float(expected),
                    student_val=float(student_val),
                    tolerance=tolerance,
                )
                scores.append(score)
            except (ValueError, TypeError):
                scores.append(0.0)

    return round(sum(scores) / len(expected_values), 2) if scores else 0.0
