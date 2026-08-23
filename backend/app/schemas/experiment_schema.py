"""
app/schemas/experiment_schema.py
--------------------------------
Pydantic v2 schemas for the Experiment resource.
"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator

from app.models.experiment import Difficulty, ExperimentStatus, SimulationType, Subject


# ---------------------------------------------------------------------------
# Shared base
# ---------------------------------------------------------------------------

class ExperimentBase(BaseModel):
    title: str = Field(
        ...,
        min_length=3,
        max_length=255,
        examples=["Titration of HCl with NaOH"],
        description="Experiment title visible to students.",
    )
    subject: Subject = Field(
        ...,
        description="Curriculum subject: Physics | Chemistry | Biology",
    )
    difficulty: Difficulty = Field(
        default=Difficulty.beginner,
        description="Difficulty tier: Beginner | Intermediate | Advanced",
    )
    simulation_type: SimulationType = Field(
        default=SimulationType.generic,
        description="Simulation interface type: ohms_law | titration | velocity | ph | generic",
    )
    status: ExperimentStatus = Field(
        default=ExperimentStatus.draft,
        description="Publication status: draft | published | archived",
    )
    topic: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Curriculum topic e.g. Current Electricity",
    )
    description: str = Field(
        ...,
        min_length=10,
        description="Overview shown to students before they start.",
    )
    materials: Optional[list[str] | dict[str, Any]] = Field(
        default=None,
        description="Required laboratory materials, chemicals, or apparatus.",
    )
    instructions: Optional[list[dict[str, Any]]] = Field(
        default=None,
        description=(
            "Ordered list of step objects. "
            "Each step: {step: int, action: str, hint?: str}"
        ),
        examples=[[{"step": 1, "action": "Pour 50ml of HCl into a beaker"}]],
    )
    parameters: Optional[dict[str, Any]] = Field(
        default=None,
        description="Formula constants, expected values, and scoring tolerances.",
        examples=[{"expected_ph": 7.0, "tolerance": 0.2}],
    )


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

class ExperimentCreate(ExperimentBase):
    """Accepted by `POST /api/v1/experiments` (teacher/admin only)."""
    pass


# ---------------------------------------------------------------------------
# Update (PATCH — all fields optional)
# ---------------------------------------------------------------------------

class ExperimentUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=255)
    subject: Optional[Subject] = None
    difficulty: Optional[Difficulty] = None
    simulation_type: Optional[SimulationType] = None
    status: Optional[ExperimentStatus] = None
    topic: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = Field(default=None, min_length=10)
    materials: Optional[list[str] | dict[str, Any]] = None
    instructions: Optional[list[dict[str, Any]]] = None
    parameters: Optional[dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Sanitization Helper
# ---------------------------------------------------------------------------

SENSITIVE_GRADING_KEYS = {
    "expected_values",
    "tolerance",
    "grading_config",
    "answer_key",
    "answers",
    "expected",
    "solution",
}

def sanitize_student_parameters(params: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    """Remove hidden grading parameters, expected values, and tolerances from student view."""
    if not params:
        return None
    return {k: v for k, v in params.items() if k not in SENSITIVE_GRADING_KEYS}


# ---------------------------------------------------------------------------
# Student Response (Sanitized — NO expected_values or tolerance)
# ---------------------------------------------------------------------------

class ExperimentStudentResponse(BaseModel):
    """
    Returned to students.
    Sensitive grading parameters (expected_values, tolerance) are strictly excluded.
    Only published experiments are returned to students.
    """

    id: int
    title: str
    subject: Subject
    difficulty: Difficulty
    simulation_type: SimulationType = SimulationType.generic
    status: ExperimentStatus = ExperimentStatus.published
    topic: Optional[str] = None
    description: str
    materials: Optional[list[str] | dict[str, Any]] = None
    instructions: Optional[list[dict[str, Any]]] = None
    parameters: Optional[dict[str, Any]] = None
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    @field_validator("parameters", mode="before")
    @classmethod
    def filter_parameters_for_student(cls, v: Any) -> Any:
        if isinstance(v, dict):
            return sanitize_student_parameters(v)
        return v

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 1,
                "title": "Titration of HCl with NaOH",
                "subject": "Chemistry",
                "difficulty": "Intermediate",
                "simulation_type": "titration",
                "status": "published",
                "topic": "Acids, Bases & Salts",
                "description": "Students learn acid-base neutralisation.",
                "materials": ["Burette", "Pipette", "0.1M HCl", "0.1M NaOH"],
                "instructions": [{"step": 1, "action": "Fill burette with NaOH"}],
                "parameters": {"voltage_V": 12.0, "resistance_ohm": 4.0},
                "created_by": 3,
                "created_at": "2024-09-01T08:00:00Z",
                "updated_at": "2024-09-01T08:00:00Z",
            }
        },
    }


# ---------------------------------------------------------------------------
# Teacher / Admin Response (Full — includes parameters & grading_config)
# ---------------------------------------------------------------------------

class ExperimentTeacherResponse(ExperimentBase):
    """Returned to teachers and admins. Includes full grading configuration."""

    id: int
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 1,
                "title": "Titration of HCl with NaOH",
                "subject": "Chemistry",
                "difficulty": "Intermediate",
                "simulation_type": "titration",
                "status": "published",
                "topic": "Acids, Bases & Salts",
                "description": "Students learn acid-base neutralisation.",
                "materials": ["Burette", "Pipette", "0.1M HCl", "0.1M NaOH"],
                "instructions": [{"step": 1, "action": "Fill burette with NaOH"}],
                "parameters": {"expected_ph": 7.0, "tolerance": 0.2},
                "created_by": 3,
                "created_at": "2024-09-01T08:00:00Z",
                "updated_at": "2024-09-01T08:00:00Z",
            }
        },
    }


class ExperimentAdminResponse(ExperimentTeacherResponse):
    """Alias for teacher response for administrators."""
    pass


# Default alias for backwards compatibility
ExperimentResponse = ExperimentTeacherResponse
