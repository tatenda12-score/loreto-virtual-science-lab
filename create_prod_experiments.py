import urllib.request
import urllib.parse
import json

base_url = 'https://loreto-virtual-science-lab.onrender.com/api/v1'
admin_email = 'admin@loreto.edu.ng'
admin_password = 'Demo123!'

# 1. Login
login_data = urllib.parse.urlencode({'username': admin_email, 'password': admin_password}).encode('ascii')
req = urllib.request.Request(f'{base_url}/auth/login', data=login_data, method='POST')
try:
    with urllib.request.urlopen(req) as response:
        token = json.loads(response.read())['access_token']
except Exception as e:
    print(f"Login failed: {e}")
    exit(1)

print("Logged in successfully.")

# 2. Experiments to create
experiments = [
    {
        "title": "Food Tests",
        "subject": "Biology",
        "difficulty": "Beginner",
        "topic": "Nutrition & Biochemistry",
        "description": "Perform common laboratory food tests to identify the presence of starch, proteins, reducing sugars, and lipids using interactive reagents.",
        "class_level": "Form3",
        "simulation_type": "food_tests",
        "status": "published",
        "materials": ["Iodine Solution", "Benedict's Reagent", "Biuret Reagent", "Ethanol", "Food Samples"],
        "instructions": [
            {"step": 1, "action": "Select a food sample from the laboratory bench."},
            {"step": 2, "action": "Select the appropriate reagent to test for the suspected nutrient."},
            {"step": 3, "action": "Click 'Add Reagent & Observe' to perform the test."},
            {"step": 4, "action": "Record the resulting color change and your conclusion (e.g., 'Starch present')."}
        ],
        "parameters": {
            "expected_values": {
                "potato_iodine_conclusion": "Starch",
                "egg_biuret_conclusion": "Protein"
            },
            "tolerance": 0.0
        }
    },
    {
        "title": "Separation of a Mixture - Sand, Salt and Water",
        "subject": "Chemistry",
        "difficulty": "Intermediate",
        "topic": "Separation Techniques",
        "description": "Determine and perform the correct sequence of laboratory separation techniques for a mixture.",
        "class_level": "Form3",
        "simulation_type": "separation",
        "status": "published",
        "materials": ["Filter funnel", "Filter paper", "Evaporating basin", "Bunsen burner", "Beaker"],
        "instructions": [
            {"step": 1, "action": "Set up the filtration apparatus using filter paper and funnel."},
            {"step": 2, "action": "Pour the mixture through the filter paper to separate the sand."},
            {"step": 3, "action": "Transfer the filtrate to an evaporating basin."},
            {"step": 4, "action": "Heat the filtrate until the water evaporates to recover the salt."}
        ],
        "parameters": {
            "expected_values": {
                "sand_separation_method": "Filtration",
                "salt_separation_method": "Evaporation"
            },
            "tolerance": 0.0
        }
    },
    {
        "title": "Principle of Moments",
        "subject": "Physics",
        "difficulty": "Intermediate",
        "topic": "Forces and Motion",
        "description": "Investigate the principle of moments using a metre rule and slotted masses.",
        "class_level": "Form3",
        "simulation_type": "moments",
        "status": "published",
        "materials": ["Metre rule", "Pivot/knife edge", "Mass hangers", "Slotted masses"],
        "instructions": [
            {"step": 1, "action": "Drag weights onto the metre rule at different distances."},
            {"step": 2, "action": "Calculate the moment for each configuration (Force x Distance)."},
            {"step": 3, "action": "Record the calculated moments for each trial."}
        ],
        "parameters": {
            "expected_values": {
                "trial1_moment": 0.4,
                "trial2_moment": 0.6
            },
            "tolerance": 0.05
        }
    }
]

# 3. Create experiments
for exp in experiments:
    req = urllib.request.Request(f'{base_url}/experiments/', data=json.dumps(exp).encode('utf-8'), method='POST')
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read())
            print(f"Created: {res['title']}")
    except urllib.error.HTTPError as e:
        print(f"Failed to create {exp['title']}: {e.code} - {e.read().decode('utf-8')}")
