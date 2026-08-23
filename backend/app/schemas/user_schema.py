"""
app/schemas/user_schema.py
--------------------------
Pydantic v2 schemas for the User resource.

Hierarchy
---------
  UserBase          ← shared fields
    └─ UserCreate   ← input: requires plain-text password
    └─ UserUpdate   ← partial input: all fields optional
  UserResponse      ← output: exposes safe fields only (no password)
  UserInDB          ← internal: includes hashed_password (never sent to client)
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models.user import UserRole


# ---------------------------------------------------------------------------
# Shared base
# ---------------------------------------------------------------------------
class UserBase(BaseModel):
    """Fields present on both input and output schemas."""

    full_name: str = Field(
        ...,
        min_length=2,
        max_length=255,
        examples=["Amaka Okonkwo"],
        description="User's full legal name",
    )
    email: EmailStr = Field(
        ...,
        examples=["amaka.okonkwo@loreto.edu.ng"],
        description="Institutional email address used as login identifier",
    )
    role: UserRole = Field(
        default=UserRole.student,
        description="System role: 'admin' | 'teacher' | 'student'",
    )
    class_level: Optional[str] = Field(
        default=None,
        max_length=50,
        examples=["SS2"],
        description="Student class level (e.g. JSS1, SS2). Leave null for staff.",
    )
    subject_code: Optional[str] = Field(
        default=None,
        max_length=50,
        examples=["CHM301"],
        description="Teacher subject code (e.g. BIO101). Leave null for others.",
    )
    gender: Optional[str] = Field(
        default=None,
        max_length=20,
        examples=["Female"],
        description="Optional gender for school reporting.",
    )

    @field_validator("full_name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("full_name must not be blank or whitespace only.")
        return v.strip()

    @field_validator("email")
    @classmethod
    def email_to_lowercase(cls, v: str) -> str:
        return v.lower()


# ---------------------------------------------------------------------------
# Input schema — public student registration
# ---------------------------------------------------------------------------
class UserRegister(BaseModel):
    """
    Public registration schema for students.
    Roles cannot be supplied here — all public registrations create student accounts.
    """

    full_name: str = Field(
        ...,
        min_length=2,
        max_length=255,
        examples=["Amaka Okonkwo"],
        description="Student's full legal name",
    )
    email: EmailStr = Field(
        ...,
        examples=["amaka.okonkwo@loreto.edu.ng"],
        description="Institutional email address used as login identifier",
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        examples=["Secur3P@ss!"],
        description="Plain-text password (min 8 chars). Will be hashed before storage.",
    )
    class_level: Optional[str] = Field(
        default=None,
        max_length=50,
        examples=["SS2"],
        description="Student class level (e.g. JSS1, SS2).",
    )
    gender: Optional[str] = Field(
        default=None,
        max_length=20,
        examples=["Female"],
        description="Optional gender for school reporting.",
    )

    @field_validator("full_name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("full_name must not be blank or whitespace only.")
        return v.strip()

    @field_validator("email")
    @classmethod
    def email_to_lowercase(cls, v: str) -> str:
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        errors: list[str] = []
        if not any(c.isupper() for c in v):
            errors.append("at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            errors.append("at least one digit")
        if not any(c in "!@#$%^&*()-_=+[]{}|;:',.<>?/" for c in v):
            errors.append("at least one special character")
        if errors:
            raise ValueError(
                f"Password must contain: {', '.join(errors)}."
            )
        return v


# ---------------------------------------------------------------------------
# Input schema — user creation (admin / internal)
# ---------------------------------------------------------------------------
class UserCreate(UserBase):
    """
    Used internally or by administrators to provision accounts with specific roles.
    The plain-text `password` is validated here and then hashed by the
    service layer before any database write.
    """

    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        examples=["Secur3P@ss!"],
        description="Plain-text password (min 8 chars). Will be hashed before storage.",
    )

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        errors: list[str] = []
        if not any(c.isupper() for c in v):
            errors.append("at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            errors.append("at least one digit")
        if not any(c in "!@#$%^&*()-_=+[]{}|;:',.<>?/" for c in v):
            errors.append("at least one special character")
        if errors:
            raise ValueError(
                f"Password must contain: {', '.join(errors)}."
            )
        return v

    @model_validator(mode="after")
    def role_field_consistency(self) -> "UserCreate":
        """
        Warn (via ValueError) if role-specific fields are populated
        inconsistently with the declared role.
        """
        if self.role == UserRole.student and self.subject_code:
            raise ValueError(
                "Students should not have a subject_code. "
                "Set role='teacher' or clear subject_code."
            )
        if self.role == UserRole.teacher and self.class_level:
            raise ValueError(
                "Teachers should not have a class_level. "
                "Set role='student' or clear class_level."
            )
        return self


# ---------------------------------------------------------------------------
# Input schema — partial update
# ---------------------------------------------------------------------------
class UserUpdate(BaseModel):
    """
    All fields are optional; only provided fields are updated (PATCH semantics).
    Password changes must go through a dedicated change-password endpoint.
    """

    full_name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    class_level: Optional[str] = Field(default=None, max_length=50)
    subject_code: Optional[str] = Field(default=None, max_length=50)
    gender: Optional[str] = Field(default=None, max_length=20)
    is_active: Optional[bool] = None


# ---------------------------------------------------------------------------
# Output schema — safe public representation
# ---------------------------------------------------------------------------
class UserResponse(UserBase):
    """
    Returned to API clients.  Sensitive fields (`hashed_password`) are
    intentionally excluded.
    """

    id: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,   # replaces orm_mode = True in Pydantic v1
        "json_schema_extra": {
            "example": {
                "id": 1,
                "full_name": "Amaka Okonkwo",
                "email": "amaka.okonkwo@loreto.edu.ng",
                "role": "student",
                "class_level": "SS2",
                "subject_code": None,
                "gender": "Female",
                "is_active": True,
                "is_verified": False,
                "created_at": "2024-09-01T08:00:00Z",
                "updated_at": "2024-09-01T08:00:00Z",
            }
        },
    }


# ---------------------------------------------------------------------------
# Internal schema — includes hashed_password (NEVER expose to clients)
# ---------------------------------------------------------------------------
class UserInDB(UserResponse):
    """
    Used internally by authentication services.
    Never serialise this schema as an API response.
    """

    hashed_password: str
