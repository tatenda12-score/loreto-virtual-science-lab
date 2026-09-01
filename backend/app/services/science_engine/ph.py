"""
app/services/science_engine/ph.py
-----------------------------------------
Calculations for pH experiment.
"""
import math

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
