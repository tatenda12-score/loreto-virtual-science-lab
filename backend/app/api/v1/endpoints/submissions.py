"""
app/api/v1/endpoints/submissions.py
-------------------------------------
Lab submission endpoints for the Virtual Science Lab.

Flow
----
  1. Student POSTs observations for an experiment.
  2. The engine auto-grades against ``Experiment.parameters`` → ``calculated_score``.
  3. Teacher PATCHes ``/{id}/grade`` to leave feedback or override the score.

Permissions
-----------
  POST /                — Student only
  GET  /me              — Student (own submissions only)
  GET  /experiment/{id} — Teacher or Admin (all submissions for an experiment)
  PATCH/{id}/grade      — Teacher or Admin
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_roles
from app.db.database import get_db
from app.models.experiment import Experiment
from app.models.submission import Submission, SubmissionStatus
from app.models.user import User, UserRole
from app.schemas.submission_schema import (
    SubmissionCreate,
    SubmissionResponse,
    SubmissionUpdate,
)
from app.services.science_engine import grade_submission

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /  — Student submits a lab report (auto-graded)
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a lab report",
    description=(
        "**Role required:** `student`. "
        "Submits recorded observations for an experiment. "
        "The system automatically calculates a score by comparing the student's "
        "observations against the theoretical values in `Experiment.parameters`."
    ),
)
def create_submission(
    payload: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.student)),
) -> SubmissionResponse:
    # ── Validate experiment exists ─────────────────────────────────────
    experiment = (
        db.query(Experiment).filter(Experiment.id == payload.experiment_id).first()
    )
    if not experiment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experiment with id={payload.experiment_id} not found.",
        )

    # ── Auto-grade using the science engine ───────────────────────────
    calculated_score: float | None = None
    observations = payload.recorded_observations or {}

    if experiment.parameters and observations:
        try:
            calculated_score = grade_submission(
                experiment_parameters=experiment.parameters,
                recorded_observations=observations,
            )
        except Exception:
            # Grading failure is non-fatal — submission is still saved
            calculated_score = None

    # ── Persist submission ─────────────────────────────────────────────
    submission = Submission(
        student_id=current_user.id,
        experiment_id=payload.experiment_id,
        recorded_observations=observations,
        calculated_score=calculated_score,
        status=SubmissionStatus.submitted,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(submission)
    db.flush()
    db.refresh(submission)
    return submission  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# GET /me  — Student's own submissions
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=list[SubmissionResponse],
    summary="Get my submissions",
    description="Returns all lab submissions belonging to the authenticated student.",
)
def get_my_submissions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.student)),
) -> list[SubmissionResponse]:
    submissions = (
        db.query(Submission)
        .filter(Submission.student_id == current_user.id)
        .order_by(Submission.submitted_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return submissions  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# GET /experiment/{experiment_id}  — All submissions for an experiment (Teacher/Admin)
# ---------------------------------------------------------------------------

@router.get(
    "/experiment/{experiment_id}",
    response_model=list[SubmissionResponse],
    summary="List all submissions for an experiment",
    description="**Role required:** `teacher` or `admin`.",
)
def get_submissions_for_experiment(
    experiment_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
) -> list[SubmissionResponse]:
    # Verify experiment exists first
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experiment with id={experiment_id} not found.",
        )

    submissions = (
        db.query(Submission)
        .filter(Submission.experiment_id == experiment_id)
        .order_by(Submission.submitted_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return submissions  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# GET /{submission_id}  — Single submission (owner or teacher/admin)
# ---------------------------------------------------------------------------

@router.get(
    "/{submission_id}",
    response_model=SubmissionResponse,
    summary="Get a single submission",
    description="Students can only view their own submissions. Teachers and admins can view any.",
)
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> SubmissionResponse:
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission with id={submission_id} not found.",
        )

    # Students may only view their own
    if (
        current_user.role == UserRole.student
        and submission.student_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to view another student's submission.",
        )
    return submission  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# PATCH /{submission_id}/grade  — Teacher grades / overrides score
# ---------------------------------------------------------------------------

@router.patch(
    "/{submission_id}/grade",
    response_model=SubmissionResponse,
    summary="Grade a submission",
    description=(
        "**Role required:** `teacher` or `admin`. "
        "Allows the teacher to provide written feedback and optionally override "
        "the auto-calculated score. Sets status to `graded`."
    ),
)
def grade_submission_endpoint(
    submission_id: int,
    payload: SubmissionUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
) -> SubmissionResponse:
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission with id={submission_id} not found.",
        )

    if submission.status == SubmissionStatus.draft:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Cannot grade a draft submission. "
                "The student must submit it first (status='submitted')."
            ),
        )

    # Apply only provided fields
    if payload.teacher_feedback is not None:
        submission.teacher_feedback = payload.teacher_feedback
    if payload.calculated_score is not None:
        submission.calculated_score = payload.calculated_score

    # Always advance status to graded
    submission.status = SubmissionStatus.graded

    db.flush()
    db.refresh(submission)
    return submission  # type: ignore[return-value]
