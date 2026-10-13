"""
app/services/science_engine/grading.py
-----------------------------------------
Generic and dynamic grading logic with honest marking and rigorous auto-grading.
"""
from typing import Any
import math
from .ohms_law import calculate_ohms_law
from .velocity import calculate_velocity
from .titration import calculate_titration
from .ph import calculate_ph

def evaluate_submission(
    expected_val: float,
    student_val:  float,
    tolerance:    float = 0.05,
    tolerance_type: str | None = None,
) -> float:
    """
    Score a single student measurement against the theoretical (expected) value.
    Honest marking:
    - If tolerance_type is 'absolute' or auto-detected as absolute:
      deviations beyond absolute tolerance result in 0.0%.
    - If tolerance_type is 'percentage'/'relative' or auto-detected as relative:
      percentage errors beyond tolerance fraction result in 0.0%.
    - Proportional score scales strictly between 0% and 100%.
    """
    try:
        expected_val = float(expected_val)
        student_val = float(student_val)
        tolerance = float(tolerance)
    except (ValueError, TypeError):
        return 0.0

    if math.isnan(student_val) or math.isnan(expected_val) or math.isinf(student_val):
        return 0.0

    if tolerance <= 0:
        return 100.0 if abs(student_val - expected_val) < 1e-9 else 0.0

    if expected_val == 0.0:
        abs_error = abs(student_val)
        raw_score = max(0.0, 1.0 - (abs_error / tolerance)) * 100.0
        return round(raw_score, 2)

    # Determine whether tolerance is an absolute quantity or relative percentage
    if tolerance_type == "absolute":
        is_absolute = True
    elif tolerance_type in ("percentage", "relative"):
        is_absolute = False
    else:
        # Auto-detection heuristic:
        # Physical tolerances >= 0.5 (e.g. ±2.0 °C, ±5.0 kJ/mol, ±15.0 GPa) are absolute measurements.
        # Likewise, 0.1 or 0.2 on quantities >= 2.0 (e.g. ±0.2 cm³ on 25 cm³ titre) are absolute.
        if tolerance >= 0.5:
            is_absolute = True
        elif tolerance in (0.1, 0.2) and abs(expected_val) >= 2.0:
            is_absolute = True
        else:
            is_absolute = False

    if is_absolute:
        abs_error = abs(student_val - expected_val)
        raw_score = max(0.0, 1.0 - (abs_error / tolerance)) * 100.0
    else:
        pct_error = abs(student_val - expected_val) / abs(expected_val)
        raw_score = max(0.0, 1.0 - (pct_error / tolerance)) * 100.0

    return round(raw_score, 2)


def grade_dynamic_velocity(
    recorded_observations: dict[str, Any],
    tolerance: float = 0.05,
    tolerance_type: str | None = None,
) -> float:
    """
    Dynamically grade a Velocity submission.
    """
    try:
        raw_d = recorded_observations.get("distance_m")
        raw_t = recorded_observations.get("time_s")

        if raw_d is None or raw_t is None:
            return 0.0

        distance = float(raw_d)
        time = float(raw_t)

        if distance <= 0 or time <= 0:
            return 0.0

        expected = calculate_velocity(distance, time)
        expected_velocity = expected["velocity_ms"]

        student_val = recorded_observations.get("velocity_ms")
        if student_val is None:
            return 0.0

        student_float = float(student_val)
        if student_float <= 0:
            return 0.0

        score = evaluate_submission(
            expected_val=float(expected_velocity),
            student_val=student_float,
            tolerance=tolerance,
            tolerance_type=tolerance_type or "percentage",
        )
        return score
    except (ValueError, TypeError):
        return 0.0


def grade_dynamic_ohms_law(
    recorded_observations: dict[str, Any],
    tolerance: float = 0.05,
    tolerance_type: str | None = None,
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
                    s_val = float(student_val)
                    if s_val < 0:
                        scores.append(0.0)
                        continue
                    score = evaluate_submission(
                        expected_val=float(exp_val),
                        student_val=s_val,
                        tolerance=tolerance,
                        tolerance_type=tolerance_type or "percentage",
                    )
                    scores.append(score)
                except (ValueError, TypeError):
                    scores.append(0.0)

        return round(sum(scores) / len(expected_values), 2) if expected_values else 0.0

    except (ValueError, TypeError):
        return 0.0


def grade_dynamic_titration(
    recorded_observations: dict[str, Any],
    tolerance: float = 0.05,
    tolerance_type: str | None = None,
) -> float:
    """
    Dynamically grade an Acid-Base Titration submission.
    Formula: M1*V1 = M2*V2  =>  M2 = (M1 * V1) / V2.
    """
    try:
        v_acid = float(recorded_observations.get("volume_acid_ml", 0))
        m_acid = float(recorded_observations.get("molarity_acid", 0))
        v_base = float(recorded_observations.get("volume_base_ml", 0))
        m_base_student = recorded_observations.get("molarity_base")

        if v_acid <= 0 or m_acid <= 0 or v_base <= 0 or m_base_student is None:
            return 0.0

        expected = calculate_titration(
            volume_acid_ml=v_acid,
            molarity_acid=m_acid,
            volume_base_ml=v_base,
        )
        expected_m_base = expected["molarity_base"]
        student_val = float(m_base_student)
        if student_val <= 0:
            return 0.0

        return evaluate_submission(
            expected_val=expected_m_base,
            student_val=student_val,
            tolerance=tolerance,
            tolerance_type=tolerance_type or "percentage",
        )
    except (ValueError, TypeError):
        return 0.0


def grade_dynamic_ph(
    recorded_observations: dict[str, Any],
    tolerance: float = 0.05,
    tolerance_type: str | None = None,
) -> float:
    """
    Dynamically grade a pH submission.
    Formula: pH = -log10([H+]).
    """
    try:
        h_conc = float(recorded_observations.get("hydrogen_ion_concentration", 0))
        student_ph = recorded_observations.get("ph")

        if h_conc <= 0 or student_ph is None:
            return 0.0

        expected = calculate_ph(hydrogen_ion_concentration=h_conc)
        expected_ph = expected["ph"]
        student_val = float(student_ph)

        # pH is scored with absolute tolerance (e.g. within 0.1 or 0.2 pH units)
        tol = tolerance if (tolerance_type == "absolute" or tolerance >= 0.1) else 0.1
        return evaluate_submission(
            expected_val=expected_ph,
            student_val=student_val,
            tolerance=tol,
            tolerance_type="absolute",
        )
    except (ValueError, TypeError):
        return 0.0


def grade_dynamic_moments(
    recorded_observations: dict[str, Any],
    tolerance: float = 0.05,
    tolerance_type: str | None = None,
) -> float:
    """
    Dynamically grade Principle of Moments submission.
    Accepts Force x Distance (with g=10 N/kg) or Mass x Distance.
    """
    try:
        t1 = recorded_observations.get("trial1_moment")
        t2 = recorded_observations.get("trial2_moment")
        if t1 is None and t2 is None:
            return 0.0

        scores: list[float] = []
        for student_val, expected_pair in [
            (t1, [4.0, 0.4]), # 1kg * 10 * 0.4m = 4.0 Nm, or 1kg * 0.4m = 0.4
            (t2, [6.0, 0.6]), # 1kg * 10 * 0.6m = 6.0 Nm, or 1kg * 0.6m = 0.6
        ]:
            if student_val is None:
                scores.append(0.0)
                continue
            s_val = float(student_val)
            # Evaluate against both valid physical conventions and take the highest legitimate score
            sub_scores = [
                evaluate_submission(
                    expected_val=exp,
                    student_val=s_val,
                    tolerance=tolerance,
                    tolerance_type=tolerance_type,
                )
                for exp in expected_pair
            ]
            scores.append(max(sub_scores))

        return round(sum(scores) / len(scores), 2) if scores else 0.0
    except (ValueError, TypeError):
        return 0.0


def grade_qualitative_observation(expected_text: str, student_text: str) -> float:
    """
    Score qualitative text observations honestly.
    Rewards correct scientific terminology, strictly rejects false or contradictory answers.
    """
    s_clean = student_text.strip().lower()
    e_clean = expected_text.strip().lower()

    if not s_clean:
        return 0.0

    if s_clean == e_clean:
        return 100.0

    # Starch tests (Iodine)
    if "blue-black" in e_clean or ("colour" in e_clean and "blue" in e_clean):
        false_markers = ["red", "yellow", "orange", "green", "clear", "no change", "brown"]
        if any(marker in s_clean for marker in false_markers) and not any(k in s_clean for k in ["blue", "black"]):
            return 0.0
        if "blue" in s_clean or "black" in s_clean:
            return 100.0
        return 0.0

    if "starch" in e_clean:
        negative_markers = ["no starch", "absent", "negative", "protein", "glucose", "lipid", "fat"]
        if any(m in s_clean for m in negative_markers) and not ("present" in s_clean or "starch" in s_clean):
            return 0.0
        if "starch" in s_clean and not ("no starch" in s_clean or "absent" in s_clean):
            return 100.0
        return 0.0

    # Protein tests (Biuret)
    if "purple" in e_clean or ("colour" in e_clean and "purple" in e_clean):
        false_markers = ["blue", "yellow", "orange", "red", "green", "clear"]
        if any(marker in s_clean for marker in false_markers) and not any(k in s_clean for k in ["purple", "violet", "lilac"]):
            return 0.0
        if any(k in s_clean for k in ["purple", "violet", "lilac"]):
            return 100.0
        return 0.0

    if "protein" in e_clean:
        negative_markers = ["no protein", "absent", "negative", "starch", "sugar", "lipid"]
        if any(m in s_clean for m in negative_markers) and not ("present" in s_clean or "protein" in s_clean):
            return 0.0
        if "protein" in s_clean and not ("no protein" in s_clean or "absent" in s_clean):
            return 100.0
        return 0.0

    # Separation methods
    if "filtration" in e_clean:
        if "filtration" in s_clean or "filter" in s_clean:
            return 100.0
        return 0.0

    if "evaporation" in e_clean:
        if "evaporation" in s_clean or "evaporat" in s_clean or "crystalli" in s_clean:
            return 100.0
        return 0.0

    # General substring matching fallback
    return 100.0 if (e_clean in s_clean or s_clean in e_clean) else 0.0


def grade_submission(
    experiment_parameters: dict[str, Any],
    recorded_observations: dict[str, Any],
) -> float:
    """
    Grade a full submission across all required expected fields.
    """
    if not recorded_observations:
        return 0.0

    sim_type = experiment_parameters.get("simulation_type")
    tolerance: float = float(experiment_parameters.get("tolerance", 0.05))
    tolerance_type: str | None = experiment_parameters.get("tolerance_type")

    # Dynamic Ohm's Law
    if (
        "voltage_V" in recorded_observations
        and "resistance_ohm" in recorded_observations
        and (
            sim_type == "ohms_law"
            or "current_A" in experiment_parameters.get("expected_values", {})
            or "voltage_V" in experiment_parameters
        )
    ):
        return grade_dynamic_ohms_law(
            recorded_observations,
            tolerance=tolerance,
            tolerance_type=tolerance_type,
        )

    # Dynamic Velocity
    if (
        "distance_m" in recorded_observations
        and "time_s" in recorded_observations
        and (
            sim_type == "velocity"
            or "velocity_ms" in recorded_observations
        )
    ):
        return grade_dynamic_velocity(
            recorded_observations,
            tolerance=tolerance,
            tolerance_type=tolerance_type,
        )

    # Dynamic Titration
    if (
        sim_type == "titration"
        or (
            "volume_acid_ml" in recorded_observations
            and "volume_base_ml" in recorded_observations
            and "molarity_base" in recorded_observations
        )
    ):
        return grade_dynamic_titration(
            recorded_observations,
            tolerance=tolerance,
            tolerance_type=tolerance_type,
        )

    # Dynamic pH
    if (
        sim_type == "ph"
        or (
            "hydrogen_ion_concentration" in recorded_observations
            and "ph" in recorded_observations
        )
    ):
        return grade_dynamic_ph(
            recorded_observations,
            tolerance=tolerance,
            tolerance_type=tolerance_type,
        )

    # Dynamic Moments
    if (
        sim_type == "moments"
        or (
            "trial1_moment" in recorded_observations
            and "trial2_moment" in recorded_observations
        )
    ):
        return grade_dynamic_moments(
            recorded_observations,
            tolerance=tolerance,
            tolerance_type=tolerance_type,
        )

    # Expected values static evaluation
    expected_values: dict = experiment_parameters.get("expected_values", {})
    if not expected_values:
        return 0.0

    scores: list[float] = []
    for field, expected in expected_values.items():
        student_val = recorded_observations.get(field)
        if student_val is None or student_val == "":
            scores.append(0.0)
        else:
            if isinstance(expected, str):
                score = grade_qualitative_observation(expected, str(student_val))
                scores.append(score)
            elif isinstance(expected, bool):
                score = 100.0 if bool(student_val) == expected else 0.0
                scores.append(score)
            else:
                try:
                    score = evaluate_submission(
                        expected_val=float(expected),
                        student_val=float(student_val),
                        tolerance=tolerance,
                        tolerance_type=tolerance_type,
                    )
                    scores.append(score)
                except (ValueError, TypeError):
                    scores.append(0.0)

    return round(sum(scores) / len(expected_values), 2) if scores else 0.0
