import os

filepath = 'backend/scripts/seed.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
'''        "instructions":    TITRATION_INSTRUCTIONS,
    {
        "title":           "Food Tests",''',
'''        "instructions":    TITRATION_INSTRUCTIONS,
        "parameters":      TITRATION_PARAMETERS,
    },
    {
        "title":           "Food Tests",'''
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
