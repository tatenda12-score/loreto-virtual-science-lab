import os

filepath = 'backend/scripts/seed.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_seed_experiments = '''
# ---------------------------------------------------------------------------
# Form 3 Experiment 1: Food Tests (Biology)
# ---------------------------------------------------------------------------
FOOD_TESTS_PARAMETERS = {
    "expected_values": {
        "potato_iodine_observation": "Blue-black colour",
        "potato_iodine_conclusion": "Starch present",
        "egg_biuret_observation": "Purple colour",
        "egg_biuret_conclusion": "Protein present",
    },
    "tolerance": 0.0,
}

FOOD_TESTS_INSTRUCTIONS = [
    {"step": 1, "action": "Select a food sample and place it in the test tube."},
    {"step": 2, "action": "Select the appropriate reagent for the test."},
    {"step": 3, "action": "Observe the colour change and record your observations."},
]

# ---------------------------------------------------------------------------
# Form 3 Experiment 2: Separation of a Mixture (Chemistry)
# ---------------------------------------------------------------------------
SEPARATION_PARAMETERS = {
    "expected_values": {
        "sand_separation_method": "Filtration",
        "salt_separation_method": "Evaporation",
    },
    "tolerance": 0.0,
}

SEPARATION_INSTRUCTIONS = [
    {"step": 1, "action": "Set up the filtration apparatus using filter paper and funnel."},
    {"step": 2, "action": "Pour the mixture through the filter paper to separate the sand."},
    {"step": 3, "action": "Transfer the filtrate to an evaporating basin."},
    {"step": 4, "action": "Heat the filtrate until the water evaporates to recover the salt."},
]

# ---------------------------------------------------------------------------
# Form 3 Experiment 3: Principle of Moments (Physics)
# ---------------------------------------------------------------------------
MOMENTS_PARAMETERS = {
    "expected_values": {
        "trial1_moment": 0.40,
        "trial2_moment": 0.60,
    },
    "tolerance": 0.05,
}

MOMENTS_INSTRUCTIONS = [
    {"step": 1, "action": "Drag weights onto the metre rule at different distances."},
    {"step": 2, "action": "Calculate the moment for each configuration (Force x Distance)."},
    {"step": 3, "action": "Record the calculated moments for each trial."},
]

SEED_EXPERIMENTS: list[dict] = [
    {
        "title":           "Food Tests",
        "subject":         Subject.biology,
        "difficulty":      Difficulty.beginner,
        "simulation_type": SimulationType.food_tests,
        "status":          ExperimentStatus.published,
        "topic":           "Nutrition",
        "description": "Test different food samples for Starch, Reducing sugars, Protein, and Lipids.",
        "materials": ["Test tubes", "Iodine solution", "Benedict's solution", "Biuret reagent", "Ethanol"],
        "instructions": FOOD_TESTS_INSTRUCTIONS,
        "parameters": FOOD_TESTS_PARAMETERS,
        "class_level": "Form3",
    },
    {
        "title":           "Separation of a Mixture — Sand, Salt and Water",
        "subject":         Subject.chemistry,
        "difficulty":      Difficulty.intermediate,
        "simulation_type": SimulationType.separation,
        "status":          ExperimentStatus.published,
        "topic":           "Separation Techniques",
        "description": "Determine and perform the correct sequence of laboratory separation techniques for a mixture.",
        "materials": ["Filter funnel", "Filter paper", "Evaporating basin", "Bunsen burner", "Beaker"],
        "instructions": SEPARATION_INSTRUCTIONS,
        "parameters": SEPARATION_PARAMETERS,
        "class_level": "Form3",
    },
    {
        "title":           "Principle of Moments",
        "subject":         Subject.physics,
        "difficulty":      Difficulty.intermediate,
        "simulation_type": SimulationType.moments,
        "status":          ExperimentStatus.published,
        "topic":           "Forces and Motion",
        "description": "Investigate the principle of moments using a metre rule and slotted masses.",
        "materials": ["Metre rule", "Pivot/knife edge", "Mass hangers", "Slotted masses"],
        "instructions": MOMENTS_INSTRUCTIONS,
        "parameters": MOMENTS_PARAMETERS,
        "class_level": "Form3",
    },
'''

content = content.replace("SEED_EXPERIMENTS: list[dict] = [", new_seed_experiments)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
