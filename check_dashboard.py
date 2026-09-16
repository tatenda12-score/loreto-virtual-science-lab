import os

filepath = 'frontend/src/pages/StudentDashboard.tsx'
if os.path.exists(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Just print the part where it handles the simulation component
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'OhmsLawSimulation' in line or 'switch' in line or 'SimulationComponent' in line:
            start = max(0, i-5)
            end = min(len(lines), i+20)
            print('\n'.join(lines[start:end]))
            break
