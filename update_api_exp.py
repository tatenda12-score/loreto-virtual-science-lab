import os
import sqlite3

# 1. Update the DB to set all existing experiments to Form4
db_path = 'backend/loreto_lab.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("UPDATE experiments SET class_level = 'Form4';")
        print("Updated existing experiments to Form4")
    except Exception as e:
        print("DB Update Error:", e)
    conn.commit()
    conn.close()

# 2. Update the API
filepath = 'backend/app/api/v1/endpoints/experiments.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_list = '''    if _current_user.role == UserRole.student:
        # Students can strictly view published experiments only
        query = query.filter(Experiment.status == ExperimentStatus.published)
    else:'''

new_list = '''    if _current_user.role == UserRole.student:
        # Students can strictly view published experiments only
        query = query.filter(Experiment.status == ExperimentStatus.published)
        # Students can only view experiments for their class or unassigned experiments
        query = query.filter(
            (Experiment.class_level == _current_user.class_level) | (Experiment.class_level == None) | (Experiment.class_level == "")
        )
    else:'''
content = content.replace(old_list, new_list)

old_get = '''    # Students cannot view draft or archived experiments
    if (
        _current_user.role == UserRole.student
        and experiment.status != ExperimentStatus.published
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experiment with id={experiment_id} not found.",
        )'''

new_get = '''    # Students cannot view draft or archived experiments or those not in their class
    if _current_user.role == UserRole.student:
        if experiment.status != ExperimentStatus.published:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Experiment with id={experiment_id} not found.",
            )
        if experiment.class_level and experiment.class_level != "" and experiment.class_level != _current_user.class_level:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Experiment with id={experiment_id} not found for your class.",
            )'''
content = content.replace(old_get, new_get)

# Also update create_experiment to include class_level
content = content.replace(
    "        topic=payload.topic,",
    "        topic=payload.topic,\n        class_level=payload.class_level,"
)

# And duplicate_experiment
content = content.replace(
    "        topic=experiment.topic,",
    "        topic=experiment.topic,\n        class_level=experiment.class_level,"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
