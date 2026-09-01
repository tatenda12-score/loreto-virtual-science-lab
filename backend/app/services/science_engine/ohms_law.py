"""
app/services/science_engine/ohms_law.py
-----------------------------------------
Calculations for Ohm's Law experiment.
"""

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
    ValueError  if voltage or resistance <= 0.
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
