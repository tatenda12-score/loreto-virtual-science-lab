"""
app/services/science_engine/grading.py
-----------------------------------------
Generic and dynamic grading logic.
"""
from typing import Any
from .ohms_law import calculate_ohms_law

def evaluate_submission(
    expected_val: float,
    student_val:  float,
    tolerance:    float = 0.05,
) -> float:
    """
    Score a single student measurement against the theoretical (expected) value.
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
    """
    try:
        raw_v = recorded_observations.get("voltage_V")
        raw_r = recorded_observations.get("resistance_ohm")

        if raw_v is None or raw_r is None:
            return 0.0

        voltage = float(raw_v)
        resistance = float(raw_r)

        if voltage <= 0 or voltage > 1000:
            return 0.0
        if resistance <= 0 or resistance > 1_000_000:
            return 0.0

        expected = calculate_ohms_law(voltage, resistance)
        
        expected_values = {
            "current_A": expected["current_A"],
            "power_W": expected["power_W"],
        }

        scores: list[float] = []
        for field, exp_val in expected_values.items():
            student_val = recorded_observations.get(field)
            if student_val is None:
                scores.append(0.0)
            else:
                try:
                    score = evaluate_submission(
                        expected_val=float(exp_val),
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
    """
    if not recorded_observations:
        return 0.0

    tolerance: float = float(experiment_parameters.get("tolerance", 0.05))

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
