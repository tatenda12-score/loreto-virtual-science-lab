import os

filepath = 'backend/scripts/seed.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("calculated_score=score,", "automatic_score=score,")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
