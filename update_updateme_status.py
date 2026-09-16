import os

filepath = 'updateme.txt'
if os.path.exists(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('Submission lifecycle: draft ? submitted ? graded', 'Submission lifecycle: draft ? graded (auto-graded immediately)')
    content = content.replace('When student submits, the engine compares observations against', 'When student submits, the engine compares observations against')
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
