"""
app/schemas/submission_schema.py
---------------------------------
Pydantic v2 schemas for the Submission resource.
"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator

from app.models.submission import SubmissionStatus


# ---------------------------------------------------------------------------
# Shared base
# ---------------------------------------------------------------------------

class SubmissionBase(BaseModel):
    recorded_observations: Optional[dict[str, Any]] = Field(
        default=None,
        description=(
            "Key-value observations entered by the student during the experiment. "
            "Schema is flexible and experiment-dependent."
        ),
        examples=[{"temperature_c": 22.5, "colour_change": True}],
    )


# ---------------------------------------------------------------------------
# Create (student submits a new attempt)
# ---------------------------------------------------------------------------

class SubmissionCreate(SubmissionBase):
    """
    Posted by a student to start or save a draft submission.

    ``experiment_id`` must reference an existing, active experiment.
    ``student_id`` is derived from the JWT token — never trusted from body.
    """

    experiment_id: int = Field(
        ...,
        gt=0,
        description="The experiment being attempted.",
    )


# ---------------------------------------------------------------------------
# Update (PATCH — student edits draft OR teacher grades)
# ---------------------------------------------------------------------------

class SubmissionUpdate(BaseModel):
    """
    Students can update ``recorded_observations`` while status is *draft*.
    Teachers can set ``calculated_score``, ``teacher_feedback``, and ``status``.
    """

    recorded_observations: Optional[dict[str, Any]] = None
    calculated_score: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Score between 0 and 100 (inclusive).",
    )
    teacher_feedback: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Free-text feedback from the grading teacher.",
    )
    status: Optional[SubmissionStatus] = Field(
        default=None,
        description="Allowed transitions: draft→submitted (student), submitted→graded (teacher).",
    )

    @field_validator("calculated_score")
    @classmethod
    def score_precision(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            return round(v, 2)
        return v


# ---------------------------------------------------------------------------
# Response (output)
# ---------------------------------------------------------------------------

class SubmissionResponse(SubmissionBase):
    """Returned by read endpoints. Visible to the owning student and teachers."""

    id: int
    student_id: int
    experiment_id: int
    calculated_score: Optional[float]
    teacher_feedback: Optional[str]
    status: SubmissionStatus
    submitted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 42,
                "student_id": 7,
                "experiment_id": 1,
                "recorded_observations": {"temperature_c": 22.5, "colour_change": True},
                "calculated_score": 87.5,
                "teacher_feedback": "Good work! Be more precise with temperature readings.",
                "status": "graded",
                "submitted_at": "2024-09-02T10:30:00Z",
                "created_at": "2024-09-02T09:00:00Z",
                "updated_at": "2024-09-02T12:00:00Z",
            }
        },
    }
