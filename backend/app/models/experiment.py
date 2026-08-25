"""
app/models/experiment.py
------------------------
SQLAlchemy 2.0 ORM model for science experiments.

An Experiment is authored by a teacher/admin and contains:
  - Descriptive metadata  (title, subject, difficulty)
  - Step-by-step instructions stored as JSONB
  - Formula constants & tolerances in ``parameters`` (JSONB)

Students then run these experiments and submit observations via
the Submission model.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


# ---------------------------------------------------------------------------
# Enum types
# ---------------------------------------------------------------------------

class Subject(str, enum.Enum):
    physics = "Physics"
    chemistry = "Chemistry"
    biology = "Biology"


class Difficulty(str, enum.Enum):
    beginner = "Beginner"
    intermediate = "Intermediate"
    advanced = "Advanced"


class SimulationType(str, enum.Enum):
    ohms_law = "ohms_law"
    titration = "titration"
    velocity = "velocity"
    ph = "ph"
    generic = "generic"


class ExperimentStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


# ---------------------------------------------------------------------------
# ORM Model
# ---------------------------------------------------------------------------

class Experiment(Base):
    """
    Represents a virtual science experiment available to students.

    ``instructions`` JSON/JSONB structure (example)::

        [
          {"step": 1, "action": "Add 50ml of HCl to the beaker"},
          {"step": 2, "action": "Heat to 60°C and record temperature"},
        ]

    ``parameters`` JSON/JSONB structure (example)::

        {
          "expected_ph": 7.0,
          "tolerance": 0.2,
          "constants": {"gravity": 9.81, "molar_mass_NaCl": 58.44}
        }
    """

    __tablename__ = "experiments"

    # ── Primary key ───────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )

    # ── Core metadata ─────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Human-readable experiment title",
    )
    subject: Mapped[Subject] = mapped_column(
        SAEnum(Subject, name="subject_enum", create_type=True, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        comment="Curriculum subject area",
    )
    difficulty: Mapped[Difficulty] = mapped_column(
        SAEnum(Difficulty, name="difficulty_enum", create_type=True, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=Difficulty.beginner,
        comment="Difficulty tier for student guidance",
    )
    topic: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Curriculum topic e.g. Current Electricity or Acid-Base Reactions",
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Overview paragraph shown to students before they start",
    )

    # ── Simulation & Publication Status ───────────────────────────────
    simulation_type: Mapped[SimulationType] = mapped_column(
        SAEnum(SimulationType, name="simulation_type_enum", create_type=True),
        nullable=False,
        default=SimulationType.generic,
        comment="Type of simulation interface: ohms_law | titration | velocity | ph | generic",
    )
    status: Mapped[ExperimentStatus] = mapped_column(
        SAEnum(ExperimentStatus, name="experiment_status_enum", create_type=True),
        nullable=False,
        default=ExperimentStatus.draft,
        comment="Publication status: draft | published | archived",
    )

    # ── Structured content (JSON / JSONB) ─────────────────────────────
    materials: Mapped[dict | list | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
        comment="Apparatus, chemicals, or equipment required",
    )
    instructions: Mapped[dict | list | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
        comment="Ordered list of step objects: [{step, action, hint?}]",
    )
    parameters: Mapped[dict | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
        comment="Formula constants, expected values, and scoring tolerances",
    )

    # ── Ownership ─────────────────────────────────────────────────────
    created_by: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL", name="fk_experiment_creator"),
        nullable=True,
        comment="FK → users.id of the teacher/admin who created this experiment",
    )

    # ── Audit timestamps ──────────────────────────────────────────────
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
    creator = relationship(
        "User",
        foreign_keys=[created_by],
        back_populates="created_experiments",
        lazy="select",
    )
    submissions = relationship(
        "Submission",
        back_populates="experiment",
        cascade="all, delete-orphan",
        lazy="select",
    )

    # ── Indexes ───────────────────────────────────────────────────────
    __table_args__ = (
        Index("ix_experiments_subject_difficulty", "subject", "difficulty"),
        Index("ix_experiments_status", "status"),
        Index("ix_experiments_simulation_type", "simulation_type"),
        Index("ix_experiments_created_by", "created_by"),
    )

    def __repr__(self) -> str:
        return (
            f"<Experiment id={self.id} title={self.title!r} "
            f"subject={self.subject.value} status={self.status.value}>"
        )
