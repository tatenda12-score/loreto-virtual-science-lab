"""
Diagnostic script: Query production experiments via API to check class_level assignments.
Run from project root.
"""
import urllib.request
import urllib.parse
import json

BASE_URL = 'https://loreto-virtual-science-lab.onrender.com/api/v1'
ADMIN_EMAIL = 'admin@loreto.edu.ng'
ADMIN_PASSWORD = 'Demo123!'

print("=== PRODUCTION DIAGNOSIS: Experiment class_level assignments ===\n")

# Login as admin
login_data = urllib.parse.urlencode({'username': ADMIN_EMAIL, 'password': ADMIN_PASSWORD}).encode('ascii')
req = urllib.request.Request(f'{BASE_URL}/auth/login', data=login_data, method='POST')
try:
    with urllib.request.urlopen(req) as response:
        token = json.loads(response.read())['access_token']
    print("✓ Logged in as admin\n")
except Exception as e:
    print(f"✗ Login failed: {e}")
    exit(1)

headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# Fetch all experiments (admin sees all)
req = urllib.request.Request(f'{BASE_URL}/experiments/?limit=100', headers=headers)
with urllib.request.urlopen(req) as response:
    experiments = json.loads(response.read())

print(f"Total experiments in production DB: {len(experiments)}\n")
print(f"{'ID':<5} {'Class Level':<12} {'Status':<12} {'Simulation Type':<30} {'Title'}")
print("-" * 100)
for exp in experiments:
    print(f"{exp['id']:<5} {str(exp.get('class_level','None')):<12} {exp['status']:<12} {exp.get('simulation_type',''):<30} {exp['title']}")

print("\n=== LEVEL SUMMARY ===")
from collections import Counter
levels = Counter(str(e.get('class_level')) for e in experiments)
for level, count in sorted(levels.items()):
    print(f"  {level}: {count} experiments")

print("\n=== CHECKING L6 EXPERIMENTS SPECIFICALLY ===")
l6_exps = [e for e in experiments if e.get('class_level') == 'L6']
print(f"L6 experiments found: {len(l6_exps)}")
for e in l6_exps:
    print(f"  - [{e['status']}] {e['title']} (sim_type: {e.get('simulation_type')})")

print("\n=== CHECKING Form4 EXPERIMENTS ===")
f4_exps = [e for e in experiments if e.get('class_level') == 'Form4']
print(f"Form4 experiments found: {len(f4_exps)}")
for e in f4_exps:
    print(f"  - [{e['status']}] {e['title']} (sim_type: {e.get('simulation_type')})")

print("\n=== CHECKING FOR NULL/NONE class_level (shown to all) ===")
null_exps = [e for e in experiments if not e.get('class_level')]
print(f"No class_level (shown to all): {len(null_exps)}")
for e in null_exps:
    print(f"  - [{e['status']}] {e['title']} (sim_type: {e.get('simulation_type')})")
