"""
Fix production experiments: Creates all missing experiments with correct class_level assignments.
This script is SAFE:
  - Does NOT delete any existing data
  - Does NOT modify existing experiments
  - Only creates experiments that don't already exist (matched by title)
  - Preserves all student submissions

Run from project root:
    python fix_prod_experiments.py
"""
import urllib.request
import urllib.parse
import json

BASE_URL = 'https://loreto-virtual-science-lab.onrender.com/api/v1'
ADMIN_EMAIL = 'admin@loreto.edu.ng'
ADMIN_PASSWORD = 'Demo123!'

print("=== FIX: Creating missing production experiments ===\n")

# Login as admin
login_data = urllib.parse.urlencode({'username': ADMIN_EMAIL, 'password': ADMIN_PASSWORD}).encode('ascii')
req = urllib.request.Request(f'{BASE_URL}/auth/login', data=login_data, method='POST')
try:
    with urllib.request.urlopen(req) as response:
        token = json.loads(response.read())['access_token']
    print("Logged in as admin\n")
except Exception as e:
    print(f"Login failed: {e}")
    exit(1)

headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# First, get existing experiments so we don't duplicate
req = urllib.request.Request(f'{BASE_URL}/experiments/?limit=100', headers=headers)
with urllib.request.urlopen(req) as response:
    existing = json.loads(response.read())
existing_titles = {e['title'] for e in existing}
print(f"Existing experiments: {len(existing)}")
for e in existing:
    print(f"  [{e.get('class_level','None')}] {e['title']}")

print()

# All experiments that should exist
ALL_EXPERIMENTS = [
    # ─── FORM 4 ───────────────────────────────────────────────────────────
    {
        "title": "Ohm's Law — Voltage, Current & Power",
        "subject": "Physics",
        "difficulty": "Intermediate",
        "simulation_type": "ohms_law",
        "status": "published",
        "topic": "Current Electricity & Resistance",
        "description": (
            "Students verify Ohm's Law (V = IR) by building a simple resistive "
            "circuit, measuring current with an ammeter, and computing electrical "
            "power. Results are compared against the theoretical values for a "
            "12 V source and 4 Ohm resistor."
        ),
        "materials": [
            "12V DC Power Supply",
            "4 Ohm Fixed Resistor",
            "Digital Multimeter / Ammeter",
            "Insulated Connecting Wires",
        ],
        "instructions": [
            {"step": 1, "action": "Connect the 12V power supply to the circuit board.", "hint": "Ensure the positive terminal is correctly aligned."},
            {"step": 2, "action": "Insert the 4 Ohm resistor into the circuit.", "hint": "Use the colour-coded bands to verify resistance."},
            {"step": 3, "action": "Switch on the power supply and read the ammeter.", "hint": "Expected current approximately 3 A."},
            {"step": 4, "action": "Calculate power using P = V x I and record your result.", "hint": "Expected power approximately 36 W."},
            {"step": 5, "action": "Record both current_A and power_W in your submission."},
        ],
        "parameters": {
            "voltage_V": 12.0,
            "resistance_ohm": 4.0,
            "expected_values": {"current_A": 3.0, "power_W": 36.0},
            "tolerance": 0.05,
        },
        "class_level": "Form4",
    },
    {
        "title": "Acid-Base Titration — Determining NaOH Concentration",
        "subject": "Chemistry",
        "difficulty": "Advanced",
        "simulation_type": "titration",
        "status": "published",
        "topic": "Acids, Bases & Neutralisation",
        "description": (
            "Students use a standard HCl solution to determine the unknown "
            "concentration of a NaOH solution via acid-base neutralisation. "
            "Phenolphthalein is used as the visual indicator."
        ),
        "materials": [
            "50 mL Burette with stand & clamp",
            "25 mL Volumetric Pipette & filler",
            "250 mL Conical Flask",
            "0.1 M Hydrochloric Acid (HCl)",
            "Sodium Hydroxide (NaOH) Solution",
            "Phenolphthalein Indicator Solution",
        ],
        "instructions": [
            {"step": 1, "action": "Fill the burette with 0.1 M NaOH solution and record the initial volume."},
            {"step": 2, "action": "Pipette exactly 25.0 mL of 0.1 M HCl into a conical flask.", "hint": "Add 2-3 drops of phenolphthalein indicator."},
            {"step": 3, "action": "Titrate by adding NaOH dropwise until a faint pink colour persists for 30 seconds."},
            {"step": 4, "action": "Record the final burette reading and calculate the volume of NaOH used."},
            {"step": 5, "action": "Calculate molarity_base = (volume_acid_ml x molarity_acid) / volume_base_ml.", "hint": "Expected approximately 0.1 mol/L"},
            {"step": 6, "action": "Enter molarity_base and moles_acid in your submission."},
        ],
        "parameters": {
            "volume_acid_ml": 25.0,
            "molarity_acid": 0.1,
            "expected_values": {"molarity_base": 0.1, "moles_acid": 0.0025},
            "tolerance": 0.05,
        },
        "class_level": "Form4",
    },
    {
        "title": "Testing For Starch",
        "subject": "Biology",
        "difficulty": "Beginner",
        "simulation_type": "food_tests",
        "status": "published",
        "topic": "Reproduction",
        "description": "You will be able to test for starch in leaves",
        "materials": ["Test tubes", "Iodine solution", "Leaf samples", "Water bath"],
        "instructions": [
            {"step": 1, "action": "Place a leaf sample in a test tube."},
            {"step": 2, "action": "Add iodine solution and observe."},
            {"step": 3, "action": "Record the colour change and conclusion."},
        ],
        "parameters": {
            "expected_values": {"starch_test_result": "Blue-black colour indicates starch present"},
            "tolerance": 0.0,
        },
        "class_level": "Form4",
    },
    # ─── L6 ───────────────────────────────────────────────────────────────
    {
        "title": "Enzyme Activity — Investigating Factors Affecting Enzyme Action",
        "subject": "Biology",
        "difficulty": "Advanced",
        "simulation_type": "enzyme_activity",
        "status": "published",
        "topic": "Enzymes",
        "description": "Investigate how variables such as temperature and pH affect the rate of amylase activity on starch. Measure reaction rates, plot graphs, and determine the optimum conditions.",
        "materials": ["Test tubes", "Water baths", "Thermometer", "Stopwatch", "Starch solution", "Amylase", "Iodine"],
        "instructions": [
            {"step": 1, "action": "Set the water bath to the desired temperature."},
            {"step": 2, "action": "Mix amylase and starch, and start the timer."},
            {"step": 3, "action": "Take samples at regular intervals and test with iodine."},
            {"step": 4, "action": "Record the time taken for the starch to be completely broken down."},
            {"step": 5, "action": "Plot a graph of rate vs temperature and identify the optimum."},
        ],
        "parameters": {
            "expected_values": {"optimum_temp": 37.0},
            "tolerance": 2.0,
        },
        "class_level": "L6",
    },
    {
        "title": "Quantitative Acid-Base Titration — Determination of an Unknown Concentration",
        "subject": "Chemistry",
        "difficulty": "Advanced",
        "simulation_type": "l6_titration",
        "status": "published",
        "topic": "Quantitative Analysis",
        "description": "Perform a quantitative acid-base titration to determine the concentration of an unknown solution. Record rough and accurate titres, identify concordant results, and calculate the mean titre.",
        "materials": ["Burette", "Pipette", "Conical flask", "Acid solution", "Alkali solution", "Indicator", "White tile"],
        "instructions": [
            {"step": 1, "action": "Perform a rough titration to find the approximate endpoint."},
            {"step": 2, "action": "Perform accurate titrations dropwise near the endpoint."},
            {"step": 3, "action": "Identify concordant results (within 0.10 cm3)."},
            {"step": 4, "action": "Calculate the mean titre and determine the unknown concentration."},
        ],
        "parameters": {
            "expected_values": {"mean_titre_cm3": 25.0},
            "tolerance": 0.2,
        },
        "class_level": "L6",
    },
    {
        "title": "Internal Resistance of a Cell",
        "subject": "Physics",
        "difficulty": "Advanced",
        "simulation_type": "internal_resistance",
        "status": "published",
        "topic": "Current Electricity",
        "description": "Investigate the relationship between terminal potential difference and current to determine the internal resistance and EMF of a cell. Plot V against I and analyse the gradient.",
        "materials": ["Cell", "Ammeter", "Voltmeter", "Variable resistor", "Switch", "Connecting wires"],
        "instructions": [
            {"step": 1, "action": "Construct a circuit with the cell, variable resistor, and switch in series."},
            {"step": 2, "action": "Connect the voltmeter in parallel across the cell."},
            {"step": 3, "action": "Vary the external resistance and record pairs of V and I."},
            {"step": 4, "action": "Plot V against I to find EMF (intercept) and internal resistance (negative gradient)."},
        ],
        "parameters": {
            "expected_values": {"emf_V": 1.5, "internal_resistance_ohm": 0.5},
            "tolerance": 0.1,
        },
        "class_level": "L6",
    },
    # ─── UPPER 6 ──────────────────────────────────────────────────────────
    {
        "title": "Investigating the Rate of Photosynthesis and Limiting Factors",
        "subject": "Biology",
        "difficulty": "Advanced",
        "simulation_type": "u6_photosynthesis",
        "status": "published",
        "topic": "Photosynthesis",
        "description": "Investigate how light intensity, CO2 concentration, and temperature affect the rate of photosynthesis. Measure oxygen production, plot graphs, and identify limiting factors.",
        "materials": ["Aquatic plant", "Transparent container", "Lamp", "Thermometer", "Stopwatch", "NaHCO3 solution", "Gas syringe"],
        "instructions": [
            {"step": 1, "action": "Select the independent variable (Light, CO2, Temp)."},
            {"step": 2, "action": "Control the other variables."},
            {"step": 3, "action": "Measure the rate of oxygen production over time."},
            {"step": 4, "action": "Plot a graph and identify the limiting factor plateau."},
        ],
        "parameters": {
            "expected_values": {"plateau_rate": 10.0},
            "tolerance": 2.0,
        },
        "class_level": "Upper6",
    },
    {
        "title": "Chemical Kinetics and Determination of Activation Energy",
        "subject": "Chemistry",
        "difficulty": "Advanced",
        "simulation_type": "u6_kinetics",
        "status": "published",
        "topic": "Chemical Kinetics",
        "description": "Determine activation energy by investigating how reaction rate changes with temperature. Use the Arrhenius equation and plot ln(k) against 1/T to find Ea.",
        "materials": ["Reaction vessel", "Pipette", "Thermometer", "Stopwatch", "Water bath", "Reactants"],
        "instructions": [
            {"step": 1, "action": "Perform the reaction at several different temperatures."},
            {"step": 2, "action": "Record the time taken for the reaction to complete."},
            {"step": 3, "action": "Calculate rate, 1/T (Kelvin), and ln(k)."},
            {"step": 4, "action": "Plot an Arrhenius graph to determine activation energy from the gradient."},
        ],
        "parameters": {
            "expected_values": {"activation_energy_kj_mol": 50.0},
            "tolerance": 5.0,
        },
        "class_level": "Upper6",
    },
    {
        "title": "Young Modulus and Elastic Behaviour of a Wire",
        "subject": "Physics",
        "difficulty": "Advanced",
        "simulation_type": "u6_young_modulus",
        "status": "published",
        "topic": "Materials",
        "description": "Investigate the relationship between force and extension in a wire. Calculate stress, strain, and determine Young Modulus from the gradient of a stress-strain graph.",
        "materials": ["Wire specimen", "Micrometer", "Mass hanger", "Slotted masses", "Vernier scale"],
        "instructions": [
            {"step": 1, "action": "Measure the diameter of the wire using a micrometer."},
            {"step": 2, "action": "Add slotted masses and record the extension."},
            {"step": 3, "action": "Calculate Stress and Strain."},
            {"step": 4, "action": "Plot a Force-Extension graph and determine Young Modulus."},
        ],
        "parameters": {
            "expected_values": {"young_modulus_gpa": 120.0},
            "tolerance": 15.0,
        },
        "class_level": "Upper6",
    },
]

# Create missing experiments
created = 0
skipped = 0

for exp in ALL_EXPERIMENTS:
    if exp["title"] in existing_titles:
        print(f"  SKIP (already exists): [{exp['class_level']}] {exp['title']}")
        skipped += 1
        continue

    req = urllib.request.Request(
        f'{BASE_URL}/experiments/',
        data=json.dumps(exp).encode('utf-8'),
        method='POST'
    )
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Content-Type', 'application/json')

    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read())
            print(f"  CREATED: [{res.get('class_level')}] {res['title']} (id={res['id']})")
            created += 1
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"  FAILED: {exp['title']}: {e.code} - {body}")

print(f"\n=== DONE ===")
print(f"  Created: {created} experiments")
print(f"  Skipped: {skipped} (already existed)")
print(f"  Total: {created + skipped} processed")

# Final verification
print("\n=== FINAL STATE ===")
req = urllib.request.Request(f'{BASE_URL}/experiments/?limit=100', headers=headers)
with urllib.request.urlopen(req) as response:
    all_exps = json.loads(response.read())

from collections import Counter
levels = Counter(str(e.get('class_level','None')) for e in all_exps)
for level, count in sorted(levels.items()):
    print(f"  {level}: {count} experiments")
