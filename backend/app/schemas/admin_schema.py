"""
app/schemas/admin_schema.py
----------------------------
Pydantic schemas for admin-only operations:
  - TeacherCreate: admin creates a teacher account
  - AdminUserUpdate: admin updates user fields
  - AdminStatsResponse: dashboard summary statistics
"""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class TeacherCreate(BaseModel):
    """Schema for admin to create a teacher account.

    Does NOT expose a ``role`` field — the backend always sets role=teacher.
    """

    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    subject_code: Optional[str] = Field(default=None, max_length=50)
    gender: Optional[str] = Field(default=None, max_length=20)
    class_level: Optional[str] = Field(default=None, max_length=50)

    @field_validator("full_name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Full name must not be blank.")
        return v

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip().lower()
            if "@" not in v:
                if v.endswith(".co.zw") or v.endswith(".edu.ng"):
                    parts = v.split(".")
                    v = f"{parts[0]}@{'.'.join(parts[1:])}"
                else:
                    v = f"{v}@loreto.co.zw"
        return v

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters.")
        return v

    @field_validator("subject_code", "gender", "class_level", mode="before")
    @classmethod
    def blank_to_none(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str):
            v = v.strip()
            return v if v else None
        return v


class AdminUserUpdate(BaseModel):
    """Schema for admin to update a user's profile.

    Cannot change ``role`` — prevents privilege escalation.
    """

    full_name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    subject_code: Optional[str] = Field(default=None, max_length=50)
    class_level: Optional[str] = Field(default=None, max_length=50)
    gender: Optional[str] = Field(default=None, max_length=20)
    class_level: Optional[str] = Field(default=None, max_length=50)
    is_active: Optional[bool] = None

    @field_validator("full_name")
    @classmethod
    def name_must_not_be_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Full name must not be blank.")
        return v

    @field_validator("email")
    @classmethod
    def email_to_lowercase(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.lower().strip()
        return v


class AdminStatsResponse(BaseModel):
    """Dashboard summary statistics for admin overview."""

    total_students: int = 0
    total_teachers: int = 0
    total_admins: int = 0
    total_experiments: int = 0
    published_experiments: int = 0
    draft_experiments: int = 0
    archived_experiments: int = 0
    total_submissions: int = 0
    graded_submissions: int = 0
    pending_submissions: int = 0
