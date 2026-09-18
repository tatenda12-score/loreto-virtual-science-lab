from typing import Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.models.experiment import Experiment, ExperimentStatus
from app.models.submission import Submission, SubmissionStatus
from app.models.user import User, UserRole
from app.schemas.analytics_schema import (
    StudentPerformanceResponse,
    AnalyticsSummary,
    PaginationMeta,
    StudentPerformanceRecord,
    ExperimentPerformance
)

def get_performance_analytics(
    db: Session,
    class_level: Optional[str] = None,
    subject: Optional[str] = None,
    period: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> StudentPerformanceResponse:
    """Calculates performance analytics based on given filters."""
    
    # 1. Base query for active students
    student_query = db.query(User).filter(User.role == UserRole.student, User.is_active == True)
    if class_level and class_level != "All Levels":
        student_query = student_query.filter(User.class_level == class_level)
        
    students = student_query.all()
    student_map = {s.id: s for s in students}
    student_ids = list(student_map.keys())
    
    if not student_ids:
        return StudentPerformanceResponse(
            summary=AnalyticsSummary(average_score=None, assessed_students=0, strong_performance=0, needs_attention=0, at_risk=0),
            students=[],
            pagination=PaginationMeta(page=page, page_size=page_size, total_students=0, total_pages=0)
        )

    # 2. Base query for available experiments
    exp_query = db.query(Experiment).filter(Experiment.status == ExperimentStatus.published)
    if subject and subject != "All Subjects":
        exp_query = exp_query.filter(Experiment.subject == subject)
    experiments = exp_query.all()
    
    # Precompute available count per student
    available_per_student = {}
    for sid in student_ids:
        s_class = student_map[sid].class_level
        avail = [e for e in experiments if e.class_level is None or e.class_level == s_class]
        available_per_student[sid] = len(avail)
        
    # 3. Fetch submissions for these students and these experiments
    exp_ids = [e.id for e in experiments]
    sub_query = db.query(Submission).filter(
        Submission.student_id.in_(student_ids),
        Submission.status.in_([SubmissionStatus.submitted, SubmissionStatus.graded])
    )
    if exp_ids:
        sub_query = sub_query.filter(Submission.experiment_id.in_(exp_ids))
    else:
        # If there are no published experiments matching criteria, there are no matching submissions
        sub_query = sub_query.filter(Submission.id == -1) 
    
    if period == "Last 30 Days":
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        sub_query = sub_query.filter(Submission.submitted_at >= thirty_days_ago)
        
    submissions = sub_query.all()
    
    # 4. Aggregate data per student
    student_stats = {sid: {"submissions": [], "scores": [], "experiments_completed": set()} for sid in student_ids}
        
    for sub in submissions:
        student_stats[sub.student_id]["submissions"].append(sub)
        student_stats[sub.student_id]["experiments_completed"].add(sub.experiment_id)
        
        score = sub.final_score if sub.final_score is not None else sub.automatic_score
        if score is not None:
            student_stats[sub.student_id]["scores"].append(score)
            
    # 5. Build records
    records = []
    total_score = 0.0
    students_with_scores = 0
    strong_count = 0
    attention_count = 0
    at_risk_count = 0
    
    exp_lookup = {e.id: e for e in experiments}
    
    for sid in student_ids:
        stats = student_stats[sid]
        s = student_map[sid]
        scores = stats["scores"]
        
        avg_score = sum(scores) / len(scores) if scores else None
        completed = len(stats["experiments_completed"])
        available = available_per_student[sid]
        completion_rate = (completed / available * 100) if available > 0 else 0.0
        
        perf = "No Data"
        if avg_score is not None:
            if avg_score >= 75:
                perf = "Strong"
                strong_count += 1
            elif avg_score >= 50:
                perf = "Needs Attention"
                attention_count += 1
            else:
                perf = "At Risk"
                at_risk_count += 1
                
        trend = "—"
        
        # Build individual experiments
        exp_list = []
        for sub in stats["submissions"]:
            score = sub.final_score if sub.final_score is not None else sub.automatic_score
            e = exp_lookup.get(sub.experiment_id)
            if e:
                exp_list.append(ExperimentPerformance(
                    experiment_id=e.id,
                    title=e.title,
                    subject=e.subject.value if hasattr(e.subject, 'value') else e.subject,
                    score=score if score is not None else 0.0,
                    status=sub.status.value,
                    submitted_at=sub.submitted_at,
                    graded_at=sub.graded_at
                ))
                
        if avg_score is not None:
            total_score += avg_score
            students_with_scores += 1
            
        records.append(StudentPerformanceRecord(
            student_id=s.id,
            name=s.full_name,
            email=s.email,
            class_level=s.class_level,
            average_score=avg_score,
            completed=completed,
            available=available,
            completion_rate=completion_rate,
            performance=perf,
            trend=trend,
            experiments=exp_list
        ))
        
    # 6. Sorting
    if sort == "highest":
        records.sort(key=lambda x: (x.average_score if x.average_score is not None else -1), reverse=True)
    elif sort == "lowest":
        records.sort(key=lambda x: (x.average_score if x.average_score is not None else 101))
    elif sort == "lowest_completion":
        records.sort(key=lambda x: x.completion_rate)
    else:
        # Default sort by average_score DESC
        records.sort(key=lambda x: (x.average_score if x.average_score is not None else -1), reverse=True)
        
    # 7. Pagination
    total_students = len(records)
    total_pages = (total_students + page_size - 1) // page_size if page_size > 0 else 0
    
    start = (page - 1) * page_size
    end = start + page_size
    paginated_records = records[start:end]
    
    # 8. Summary
    overall_avg = (total_score / students_with_scores) if students_with_scores > 0 else None
    
    return StudentPerformanceResponse(
        summary=AnalyticsSummary(
            average_score=overall_avg,
            assessed_students=students_with_scores,
            strong_performance=strong_count,
            needs_attention=attention_count,
            at_risk=at_risk_count
        ),
        students=paginated_records,
        pagination=PaginationMeta(
            page=page,
            page_size=page_size,
            total_students=total_students,
            total_pages=total_pages
        )
    )
