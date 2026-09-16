import os

filepath = 'backend/app/api/v1/endpoints/submissions.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# For get_submissions_for_experiment
old_block_1 = '''    # Teachers can only view submissions for experiments they created
    if _current_user.role == UserRole.teacher and experiment.created_by != _current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view submissions for this experiment.",
        )

    submissions = (
        db.query(Submission)
        .filter(Submission.experiment_id == experiment_id)
        .order_by(Submission.submitted_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )'''

new_block_1 = '''    query = db.query(Submission).filter(Submission.experiment_id == experiment_id)

    # Teachers can only view submissions for their assigned class
    if _current_user.role == UserRole.teacher:
        query = query.join(User, Submission.student_id == User.id).filter(User.class_level == _current_user.class_level)

    submissions = (
        query.order_by(Submission.submitted_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )'''
content = content.replace(old_block_1, new_block_1)


# For grade_submission_endpoint
old_block_2 = '''    # Teachers can only grade submissions for experiments they created
    if _current_user.role == UserRole.teacher and submission.experiment.created_by != _current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to grade submissions for this experiment.",
        )'''

new_block_2 = '''    # Teachers can only grade submissions from their assigned class
    if _current_user.role == UserRole.teacher and submission.student.class_level != _current_user.class_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to grade submissions for this student.",
        )'''
content = content.replace(old_block_2, new_block_2)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
