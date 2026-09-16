import os

filepath = 'backend/app/services/science_engine/grading.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Update grade_submission to handle string comparisons
old_grade_loop = '''    scores: list[float] = []
    for field, expected in expected_values.items():
        student_val = recorded_observations.get(field)
        if student_val is None:
            scores.append(0.0)
        else:
            try:
                score = evaluate_submission(
                    expected_val=float(expected),
                    student_val=float(student_val),
                    tolerance=tolerance,
                )
                scores.append(score)
            except (ValueError, TypeError):
                scores.append(0.0)'''

new_grade_loop = '''    scores: list[float] = []
    for field, expected in expected_values.items():
        student_val = recorded_observations.get(field)
        if student_val is None:
            scores.append(0.0)
        else:
            if isinstance(expected, str):
                score = 100.0 if str(student_val).strip().lower() == expected.strip().lower() else 0.0
                scores.append(score)
            elif isinstance(expected, bool):
                score = 100.0 if bool(student_val) == expected else 0.0
                scores.append(score)
            else:
                try:
                    score = evaluate_submission(
                        expected_val=float(expected),
                        student_val=float(student_val),
                        tolerance=tolerance,
                    )
                    scores.append(score)
                except (ValueError, TypeError):
                    scores.append(0.0)'''

content = content.replace(old_grade_loop, new_grade_loop)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
