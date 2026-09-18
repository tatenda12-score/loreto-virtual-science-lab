"""
app/api/v1/endpoints/teacher.py
-------------------------------
Teacher-only endpoints for class analytics and management.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.database import get_db
from app.models.user import User, UserRole
from app.schemas.analytics_schema import StudentPerformanceResponse
from app.services.analytics_service import get_performance_analytics

router = APIRouter()
_teacher_dep = Depends(require_roles(UserRole.teacher))

@router.get("/analytics/class-performance", response_model=StudentPerformanceResponse)
def get_teacher_class_analytics(
    subject: Optional[str] = Query(None, description="Filter by subject"),
    period: Optional[str] = Query(None, description="All Time, This Term, Last 30 Days"),
    sort: Optional[str] = Query(None, description="highest, lowest, most_improved, lowest_completion"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = _teacher_dep,
) -> StudentPerformanceResponse:
    """
    Analytics dashboard data for the teacher's assigned class only.
    """
    if not current_user.class_level:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teacher is not assigned to any class level."
        )

    # Securely override any class_level with the teacher's assigned class
    return get_performance_analytics(
        db=db,
        class_level=current_user.class_level,
        subject=subject,
        period=period,
        sort=sort,
        page=page,
        page_size=page_size
    )
