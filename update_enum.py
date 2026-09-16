import os

# Update experiment.py
filepath = 'backend/app/models/experiment.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_enum = '''class SimulationType(str, enum.Enum):
    ohms_law = "ohms_law"
    titration = "titration"
    velocity = "velocity"
    ph = "ph"
    generic = "generic"'''

new_enum = '''class SimulationType(str, enum.Enum):
    ohms_law = "ohms_law"
    titration = "titration"
    velocity = "velocity"
    ph = "ph"
    food_tests = "food_tests"
    separation = "separation"
    moments = "moments"
    generic = "generic"'''

content = content.replace(old_enum, new_enum)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

# Update experiment_schema.py
filepath = 'backend/app/schemas/experiment_schema.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_desc = '''description="Simulation interface type: ohms_law | titration | velocity | ph | generic",'''
new_desc = '''description="Simulation interface type: ohms_law | titration | velocity | ph | food_tests | separation | moments | generic",'''

content = content.replace(old_desc, new_desc)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
