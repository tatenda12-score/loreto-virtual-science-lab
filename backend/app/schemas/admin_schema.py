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
    password: str = Field(..., min_length=8, max_length=128)
    subject_code: Optional[str] = Field(default=None, max_length=50)
    gender: Optional[str] = Field(default=None, max_length=20)

    @field_validator("full_name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Full name must not be blank.")
        return v

    @field_validator("email")
    @classmethod
    def email_to_lowercase(cls, v: str) -> str:
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        special_chars = set("!@#$%^&*()-_=+[]{}|;:',.<>?/")
        if not any(c in special_chars for c in v):
            raise ValueError("Password must contain at least one special character.")
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
