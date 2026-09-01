"""
app/services/science_engine/velocity.py
-----------------------------------------
Calculations for Velocity experiment.
"""

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
