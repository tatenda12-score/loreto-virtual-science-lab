import os

replacements = {
    'frontend/src/pages/Register.tsx': [
        ('<option value="JSS1">JSS1</option>\n                    <option value="JSS2">JSS2</option>\n                    <option value="JSS3">JSS3</option>\n                    <option value="SS1">SS1</option>\n                    <option value="SS2">SS2</option>\n                    <option value="SS3">SS3</option>', '<option value="Form3">Form3</option>\n                    <option value="Form4">Form4</option>\n                    <option value="L6">L6</option>\n                    <option value="Upper6">Upper6</option>')
    ],
    'backend/app/schemas/user_schema.py': [
        ('examples=["SS2"]', 'examples=["Form4"]'),
        ('e.g. JSS1, SS2', 'e.g. Form3, L6')
    ],
    'backend/app/models/user.py': [
        ('e.g. "SS2"', 'e.g. "Form4"'),
        ("e.g. 'JSS1', 'SS2'", "e.g. 'Form3', 'L6'")
    ],
    'backend/alembic/versions/fad7289030d4_init_sqlite.py': [
        ("e.g. 'JSS1', 'SS2'", "e.g. 'Form3', 'L6'")
    ],
    'backend/scripts/seed.py': [
        ('(classes: SS1, SS2, JSS3)', '(classes: Form4, L6, Form3)'),
        ('"class_level":     "SS2",', '"class_level":     "L6",'),
        ('"class_level":     "SS1",', '"class_level":     "Form4",'),
        ('"class_level":     "JSS3",', '"class_level":     "Form3",')
    ],
    'updateme.txt': [
        ('Class: SS2 (Amaka)', 'Class: L6 (Amaka)'),
        ('Class: SS1 (Chidi)', 'Class: Form4 (Chidi)'),
        ('Class: JSS3 (Ngozi)', 'Class: Form3 (Ngozi)')
    ],
    'backend/tests/test_batch1.py': [
        ('class_level="SS2"', 'class_level="L6"'),
        ('"class_level": "SS2"', '"class_level": "L6"')
    ],
    'backend/tests/test_batch2.py': [
        ('class_level="SS2"', 'class_level="L6"'),
        ('"class_level": "SS2"', '"class_level": "L6"')
    ],
    'backend/tests/test_batch4.py': [
        ('class_level="SS2"', 'class_level="L6"'),
        ('class_level="SS1"', 'class_level="Form4"'),
        ('"class_level": "SS2"', '"class_level": "L6"'),
        ('"class_level": "SS1"', '"class_level": "Form4"')
    ],
    'backend/tests/test_security.py': [
        ('class_level="SS2"', 'class_level="L6"')
    ]
}

for filepath, reps in replacements.items():
    if not os.path.exists(filepath):
        print(f'File not found: {filepath}')
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in reps:
        content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Updated {filepath}')
