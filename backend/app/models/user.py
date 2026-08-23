"""
app/models/user.py
------------------
SQLAlchemy ORM model for the `users` table.

Roles
-----
  admin    — School IT administrator; full system access.
  teacher  — Subject teacher; manages labs and grades students.
  student  — Enrolled student; runs virtual experiments.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum as SAEnum,
    Index,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


# ---------------------------------------------------------------------------
# Role enum — stored in PostgreSQL as a native ENUM type
# ---------------------------------------------------------------------------
class UserRole(str, enum.Enum):
    """
    Inheriting from `str` means the enum value is a plain string when
    serialised by Pydantic or JSON, avoiding the `.value` boilerplate.
    """
    admin = "admin"
    teacher = "teacher"
    student = "student"


# ---------------------------------------------------------------------------
# User ORM model
# ---------------------------------------------------------------------------
class User(Base):
    """
    Central user table shared by all roles.

    Role-specific fields (`class_level`, `subject_code`) are nullable so
    a single table can serve all three personas without sparse data:
      - student  → class_level populated  (e.g. "SS2")
      - teacher  → subject_code populated (e.g. "CHM301")
      - admin    → both nullable
    """

    __tablename__ = "users"

    # ── Primary key ───────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )

    # ── Identity ──────────────────────────────────────────────────────
    full_name: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="User's full legal name"
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="Institutional email address; used as login identifier",
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="bcrypt hash — never store the plain-text password",
    )

    # ── Role & access ─────────────────────────────────────────────────
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="userrole", create_type=True),
        nullable=False,
        default=UserRole.student,
        comment="System role that drives all permission checks",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True,
        comment="Soft-disable a user without deleting their record",
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False,
        comment="Set to True after email verification is complete",
    )

    # ── Student-specific ──────────────────────────────────────────────
    class_level: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="e.g. 'JSS1', 'SS2'. Populated for student accounts only.",
    )

    # ── Teacher-specific ──────────────────────────────────────────────
    subject_code: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="e.g. 'BIO101'. Populated for teacher accounts only.",
    )

    # ── Demographics ──────────────────────────────────────────────────
    gender: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="Optional — used for school reporting only.",
    )

    # ── Audit timestamps ──────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        comment="Row creation timestamp (UTC)",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        comment="Last modification timestamp (UTC)",
    )

    # ── Relationships (back-references) ──────────────────────────────
    created_experiments = relationship(
        "Experiment",
        foreign_keys="Experiment.created_by",
        back_populates="creator",
        lazy="select",
    )
    submissions = relationship(
        "Submission",
        foreign_keys="Submission.student_id",
        back_populates="student",
        lazy="select",
    )

    # ── Composite indexes ─────────────────────────────────────────────
    __table_args__ = (
        Index("ix_users_role", "role"),
        Index("ix_users_role_class", "role", "class_level"),
        Index("ix_users_role_subject", "role", "subject_code"),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role.value}>"
