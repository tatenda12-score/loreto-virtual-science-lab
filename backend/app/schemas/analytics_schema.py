from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class ExperimentPerformance(BaseModel):
    experiment_id: int
    title: str
    subject: str
    score: float
    status: str
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None


class StudentPerformanceRecord(BaseModel):
    student_id: int
    name: str
    email: str
    class_level: Optional[str]
    average_score: Optional[float]
    completed: int
    available: int
    completion_rate: float
    performance: str  # "Strong", "Needs Attention", "At Risk", "No Data"
    trend: str        # "↑", "→", "↓", "—"
    experiments: List[ExperimentPerformance]

    model_config = ConfigDict(from_attributes=True)


class AnalyticsSummary(BaseModel):
    average_score: Optional[float]
    assessed_students: int
    strong_performance: int
    needs_attention: int
    at_risk: int


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total_students: int
    total_pages: int


class StudentPerformanceResponse(BaseModel):
    summary: AnalyticsSummary
    students: List[StudentPerformanceRecord]
    pagination: PaginationMeta
