"""
app/models/submission.py
------------------------
SQLAlchemy 2.0 ORM model for student lab submissions.

Lifecycle
---------
  draft      → student is still filling in observations
  submitted  → student has submitted for grading
  graded     → teacher has scored and optionally left feedback
"""

import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Index,
    Integer,
    Text,
)
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


# ---------------------------------------------------------------------------
# Status enum
# ---------------------------------------------------------------------------

class SubmissionStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    graded = "graded"


# ---------------------------------------------------------------------------
# ORM Model
# ---------------------------------------------------------------------------

class Submission(Base):
    """
    Records a student's attempt at a virtual experiment.

    ``recorded_observations`` JSONB structure (example)::

        {
          "temperature_readings": [21.5, 22.0, 22.3],
          "colour_change_observed": true,
          "time_to_reaction_s": 45
        }

    The ``calculated_score`` is populated automatically by the grading
    service that compares observations against Experiment.parameters.
    """

    __tablename__ = "submissions"

    # ── Primary key ───────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )

    # ── Ownership / foreign keys ──────────────────────────────────────
    student_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE", name="fk_submission_student"),
        nullable=False,
        index=True,
        comment="FK → users.id of the student who made this submission",
    )
    experiment_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "experiments.id", ondelete="CASCADE", name="fk_submission_experiment"
        ),
        nullable=False,
        index=True,
        comment="FK → experiments.id that was attempted",
    )

    # ── Student-supplied data ─────────────────────────────────────────
    recorded_observations: Mapped[dict | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
        comment="Freeform key-value observations entered by the student",
    )

    # ── Grading ───────────────────────────────────────────────────────
    calculated_score: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Auto-calculated score (0-100) or teacher-overridden value",
    )
    teacher_feedback: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Free-text feedback written by the grading teacher",
    )
    status: Mapped[SubmissionStatus] = mapped_column(
        SAEnum(SubmissionStatus, name="submissionstatus_enum", create_type=True),
        nullable=False,
        default=SubmissionStatus.draft,
        comment="Lifecycle state: draft → submitted → graded",
    )

    # ── Timestamps ────────────────────────────────────────────────────
    submitted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Set when the student finalises the submission (status=submitted)",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ─────────────────────────────────────────────────
    student = relationship(
        "User",
        foreign_keys=[student_id],
        back_populates="submissions",
        lazy="select",
    )
    experiment = relationship(
        "Experiment",
        foreign_keys=[experiment_id],
        back_populates="submissions",
        lazy="select",
    )

    # ── Composite indexes ─────────────────────────────────────────────
    __table_args__ = (
        Index("ix_submissions_student_experiment", "student_id", "experiment_id"),
        Index("ix_submissions_status", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<Submission id={self.id} student_id={self.student_id} "
            f"experiment_id={self.experiment_id} status={self.status.value}>"
        )
