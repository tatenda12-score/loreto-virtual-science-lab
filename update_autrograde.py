import os

replacements = {
    'backend/app/api/v1/endpoints/submissions.py': [
        ('status=SubmissionStatus.submitted,', 'status=SubmissionStatus.graded,\n        graded_at=datetime.now(timezone.utc),')
    ],
    'backend/tests/test_batch1.py': [
        ('self.assertEqual(data[\"status\"], \"submitted\")', 'self.assertEqual(data[\"status\"], \"graded\")')
    ],
    'backend/tests/test_batch4.py': [
        ('self.assertEqual(data[\"status\"], \"submitted\")', 'self.assertEqual(data[\"status\"], \"graded\")')
    ]
}

for filepath, reps in replacements.items():
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in reps:
        content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
