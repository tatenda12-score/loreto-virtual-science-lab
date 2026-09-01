"""
app/services/science_engine/titration.py
-----------------------------------------
Calculations for Acid-Base Titration experiment.
"""

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
