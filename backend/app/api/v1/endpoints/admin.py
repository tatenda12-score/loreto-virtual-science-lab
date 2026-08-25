"""
app/api/v1/endpoints/admin.py
------------------------------
Admin-only endpoints for user management and dashboard statistics.

All endpoints require ``role=admin`` — students and teachers receive HTTP 403.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.security import hash_password
from app.db.database import get_db
from app.models.experiment import Experiment, ExperimentStatus
from app.models.submission import Submission, SubmissionStatus
from app.models.user import User, UserRole
from app.schemas.admin_schema import (
    AdminStatsResponse,
    AdminUserUpdate,
    TeacherCreate,
)
from app.schemas.user_schema import UserResponse

router = APIRouter()

# ---------------------------------------------------------------------------
# Dependency — every endpoint in this module is admin-only
# ---------------------------------------------------------------------------
_admin_dep = Depends(require_roles(UserRole.admin))


# ---------------------------------------------------------------------------
# GET /admin/stats — dashboard summary
# ---------------------------------------------------------------------------
@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    db: Session = Depends(get_db),
    _current_user: User = _admin_dep,
) -> AdminStatsResponse:
    """Return aggregate counts for the admin overview dashboard."""
    return AdminStatsResponse(
        total_students=db.query(User).filter(User.role == UserRole.student).count(),
        total_teachers=db.query(User).filter(User.role == UserRole.teacher).count(),
        total_admins=db.query(User).filter(User.role == UserRole.admin).count(),
        total_experiments=db.query(Experiment).count(),
        published_experiments=db.query(Experiment)
        .filter(Experiment.status == ExperimentStatus.published)
        .count(),
        draft_experiments=db.query(Experiment)
        .filter(Experiment.status == ExperimentStatus.draft)
        .count(),
        archived_experiments=db.query(Experiment)
        .filter(Experiment.status == ExperimentStatus.archived)
        .count(),
        total_submissions=db.query(Submission).count(),
        graded_submissions=db.query(Submission)
        .filter(Submission.status == SubmissionStatus.graded)
        .count(),
        pending_submissions=db.query(Submission)
        .filter(Submission.status == SubmissionStatus.submitted)
        .count(),
    )


# ---------------------------------------------------------------------------
# GET /admin/users — list users with optional role filter
# ---------------------------------------------------------------------------
@router.get("/users", response_model=list[UserResponse])
def list_users(
    role: Optional[str] = Query(default=None, description="Filter by role: student, teacher, admin"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _current_user: User = _admin_dep,
) -> list[UserResponse]:
    """List all users, optionally filtered by role."""
    query = db.query(User)

    if role is not None:
        role_lower = role.strip().lower()
        try:
            role_enum = UserRole(role_lower)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role filter '{role}'. Must be one of: student, teacher, admin.",
            )
        query = query.filter(User.role == role_enum)

    users = (
        query.order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [UserResponse.model_validate(u) for u in users]


# ---------------------------------------------------------------------------
# GET /admin/users/{user_id} — get single user details
# ---------------------------------------------------------------------------
@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _current_user: User = _admin_dep,
) -> UserResponse:
    """Retrieve a single user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id={user_id} not found.",
        )
    return UserResponse.model_validate(user)


# ---------------------------------------------------------------------------
# POST /admin/users/teacher — create a teacher account
# ---------------------------------------------------------------------------
@router.post(
    "/users/teacher",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_teacher(
    payload: TeacherCreate,
    db: Session = Depends(get_db),
    _current_user: User = _admin_dep,
) -> UserResponse:
    """Create a new teacher account.  Role is always forced to ``teacher``."""
    # Check for duplicate email
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{payload.email}' already exists.",
        )

    new_teacher = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.teacher,          # Always teacher — no escalation
        subject_code=payload.subject_code,
        gender=payload.gender,
        is_active=True,
        is_verified=True,               # Admin-created teachers are pre-verified
    )
    db.add(new_teacher)
    db.flush()
    db.refresh(new_teacher)
    return UserResponse.model_validate(new_teacher)


# ---------------------------------------------------------------------------
# PATCH /admin/users/{user_id} — update user fields
# ---------------------------------------------------------------------------
@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    _current_user: User = _admin_dep,
) -> UserResponse:
    """Update user profile fields. Cannot change role (prevents escalation)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id={user_id} not found.",
        )

    # Prevent admin from deactivating their own account
    if payload.is_active is False and user.id == _current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own admin account.",
        )

    # Check for duplicate email if email is being changed
    if payload.email is not None and payload.email != user.email:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with email '{payload.email}' already exists.",
            )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.flush()
    db.refresh(user)
    return UserResponse.model_validate(user)
