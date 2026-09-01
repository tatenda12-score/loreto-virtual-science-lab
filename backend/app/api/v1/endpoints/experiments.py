"""
app/api/v1/endpoints/experiments.py
-------------------------------------
CRUD endpoints for the Experiment resource.

Permissions
-----------
  GET  /         — Any authenticated user (student, teacher, admin)
  GET  /{id}     — Any authenticated user
  POST /         — Teacher or Admin only
  PATCH/{id}     — Teacher or Admin (owner) only
  DELETE/{id}    — Admin only
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from typing import Optional
from app.api.deps import get_current_active_user, require_roles
from app.db.database import get_db
from app.models.experiment import Experiment, ExperimentStatus
from app.models.user import User, UserRole
from app.services.audit_service import log_action
from app.schemas.experiment_schema import (
    ExperimentCreate,
    ExperimentResponse,
    ExperimentStudentResponse,
    ExperimentTeacherResponse,
    ExperimentUpdate,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /  — Create experiment (Teacher / Admin)
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=ExperimentTeacherResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new experiment",
    description=(
        "**Role required:** `teacher` or `admin`. "
        "Creates a new virtual science experiment that students can attempt."
    ),
)
def create_experiment(
    payload: ExperimentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
) -> ExperimentTeacherResponse:
    experiment = Experiment(
        title=payload.title,
        subject=payload.subject,
        difficulty=payload.difficulty,
        simulation_type=payload.simulation_type,
        status=payload.status,
        topic=payload.topic,
        description=payload.description,
        materials=payload.materials,
        instructions=payload.instructions,
        parameters=payload.parameters,
        created_by=current_user.id,
    )
    db.add(experiment)
    db.flush()
    db.refresh(experiment)
    
    log_action(db, current_user.id, "experiment_created", "Experiment", str(experiment.id), {"title": payload.title})
    
    return ExperimentTeacherResponse.model_validate(experiment)


# ---------------------------------------------------------------------------
# GET /  — List all experiments (sanitized and published-only for students)
# ---------------------------------------------------------------------------

@router.get(
    "/",
    response_model=list[ExperimentTeacherResponse | ExperimentStudentResponse],
    summary="List all experiments",
    description=(
        "Returns a paginated list of available experiments. "
        "Students strictly receive only published experiments without grading keys or tolerances."
    ),
)
def list_experiments(
    skip: int = Query(default=0, ge=0, description="Number of records to skip."),
    limit: int = Query(default=20, ge=1, le=100, description="Max records to return."),
    status_filter: Optional[ExperimentStatus] = Query(
        default=None, alias="status", description="Filter by status (teachers/admins only)."
    ),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
) -> list[ExperimentTeacherResponse | ExperimentStudentResponse]:
    query = db.query(Experiment)

    if _current_user.role == UserRole.student:
        # Students can strictly view published experiments only
        query = query.filter(Experiment.status == ExperimentStatus.published)
    else:
        if status_filter is not None:
            query = query.filter(Experiment.status == status_filter)

    experiments = (
        query.order_by(Experiment.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    if _current_user.role in (UserRole.teacher, UserRole.admin):
        return [ExperimentTeacherResponse.model_validate(exp) for exp in experiments]
    return [ExperimentStudentResponse.model_validate(exp) for exp in experiments]


# ---------------------------------------------------------------------------
# GET /{experiment_id}  — Retrieve single experiment
# ---------------------------------------------------------------------------

@router.get(
    "/{experiment_id}",
    response_model=ExperimentTeacherResponse | ExperimentStudentResponse,
    summary="Get a single experiment by ID",
)
def get_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
) -> ExperimentTeacherResponse | ExperimentStudentResponse:
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experiment with id={experiment_id} not found.",
        )

    # Students cannot view draft or archived experiments
    if (
        _current_user.role == UserRole.student
        and experiment.status != ExperimentStatus.published
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experiment with id={experiment_id} not found.",
        )

    if _current_user.role in (UserRole.teacher, UserRole.admin):
        return ExperimentTeacherResponse.model_validate(experiment)
    return ExperimentStudentResponse.model_validate(experiment)


# ---------------------------------------------------------------------------
# PATCH /{experiment_id}  — Partial update (Teacher owner / Admin)
# ---------------------------------------------------------------------------

@router.patch(
    "/{experiment_id}",
    response_model=ExperimentTeacherResponse,
    summary="Update an experiment",
    description=(
        "**Role required:** `teacher` (owner only) or `admin`. "
        "Teachers cannot modify experiments created by other teachers."
    ),
)
def update_experiment(
    experiment_id: int,
    payload: ExperimentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
) -> ExperimentTeacherResponse:
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experiment with id={experiment_id} not found.",
        )

    # Enforce ownership: Teachers can only edit experiments they created
    if current_user.role == UserRole.teacher and experiment.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to modify another teacher's experiment.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(experiment, field, value)

    db.flush()
    db.refresh(experiment)
    
    log_action(db, current_user.id, "experiment_updated", "Experiment", str(experiment.id), update_data)
    
    return ExperimentTeacherResponse.model_validate(experiment)


# ---------------------------------------------------------------------------
# DELETE /{experiment_id}  — Hard delete (Admin only)
# ---------------------------------------------------------------------------

@router.delete(
    "/{experiment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an experiment",
    description="**Role required:** `admin`.",
)
def delete_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles(UserRole.admin)),
) -> None:
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experiment with id={experiment_id} not found.",
        )
    db.delete(experiment)
    
    log_action(db, _current_user.id, "experiment_deleted", "Experiment", str(experiment_id))

# ---------------------------------------------------------------------------
# POST /{experiment_id}/publish  — Publish an experiment
# ---------------------------------------------------------------------------

@router.post(
    "/{experiment_id}/publish",
    response_model=ExperimentTeacherResponse,
    summary="Publish an experiment",
)
def publish_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
) -> ExperimentTeacherResponse:
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found.")
    
    if current_user.role == UserRole.teacher and experiment.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    if not experiment.parameters or not experiment.instructions:
        raise HTTPException(status_code=400, detail="Cannot publish incomplete experiment. Missing parameters or instructions.")
        
    experiment.status = ExperimentStatus.published
    db.flush()
    db.refresh(experiment)
    
    log_action(db, current_user.id, "experiment_published", "Experiment", str(experiment.id))
    return ExperimentTeacherResponse.model_validate(experiment)

# ---------------------------------------------------------------------------
# POST /{experiment_id}/archive  — Archive an experiment
# ---------------------------------------------------------------------------

@router.post(
    "/{experiment_id}/archive",
    response_model=ExperimentTeacherResponse,
    summary="Archive an experiment",
)
def archive_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
) -> ExperimentTeacherResponse:
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found.")
    
    if current_user.role == UserRole.teacher and experiment.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    experiment.status = ExperimentStatus.archived
    db.flush()
    db.refresh(experiment)
    
    log_action(db, current_user.id, "experiment_archived", "Experiment", str(experiment.id))
    return ExperimentTeacherResponse.model_validate(experiment)

# ---------------------------------------------------------------------------
# POST /{experiment_id}/duplicate  — Duplicate an experiment
# ---------------------------------------------------------------------------

@router.post(
    "/{experiment_id}/duplicate",
    response_model=ExperimentTeacherResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Duplicate an experiment",
)
def duplicate_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
) -> ExperimentTeacherResponse:
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found.")
    
    new_exp = Experiment(
        title=f"Copy of {experiment.title}",
        subject=experiment.subject,
        difficulty=experiment.difficulty,
        simulation_type=experiment.simulation_type,
        status=ExperimentStatus.draft, # Duplicates start as draft
        topic=experiment.topic,
        description=experiment.description,
        materials=experiment.materials,
        instructions=experiment.instructions,
        parameters=experiment.parameters,
        created_by=current_user.id,
    )
    db.add(new_exp)
    db.flush()
    db.refresh(new_exp)
    
    log_action(db, current_user.id, "experiment_duplicated", "Experiment", str(new_exp.id), {"original_id": experiment.id})
    return ExperimentTeacherResponse.model_validate(new_exp)

