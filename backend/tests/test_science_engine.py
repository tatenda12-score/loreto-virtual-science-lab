import pytest
from app.services.science_engine import ohms_law, titration, ph, velocity

def test_ohms_law():
    res = ohms_law.calculate_ohms_law(voltage=12.0, resistance=4.0)
    assert res["current_A"] == 3.0
    assert res["power_W"] == 36.0

def test_titration():
    # M1V1 = M2V2 => 0.1 * 20 = M2 * 25 => M2 = 2 / 25 = 0.08
    res = titration.calculate_titration(volume_acid_ml=20.0, molarity_acid=0.1, volume_base_ml=25.0)
    assert res["molarity_base"] == 0.08

def test_ph():
    res = ph.calculate_ph(hydrogen_ion_concentration=1e-7)
    assert res["ph"] == 7.0
    
    res2 = ph.calculate_ph(hydrogen_ion_concentration=1e-4)
    assert res2["ph"] == 4.0

def test_velocity():
    res = velocity.calculate_velocity(distance_m=100.0, time_s=10.0)
    assert res["velocity_ms"] == 10.0
