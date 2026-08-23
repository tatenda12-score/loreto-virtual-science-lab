"""
app/schemas/token_schema.py
---------------------------
Pydantic v2 schemas for JWT-based authentication.
"""

from typing import Optional

from pydantic import BaseModel, Field


class Token(BaseModel):
    """Response body returned after a successful login."""

    access_token: str = Field(..., description="Signed JWT access token.")
    token_type: str = Field(default="bearer", description="Always 'bearer'.")

    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
            }
        }
    }


class TokenPayload(BaseModel):
    """
    Decoded JWT payload — used internally by ``get_current_user``.

    ``sub`` holds the user's email address (the JWT subject).
    """

    sub: Optional[str] = Field(
        default=None,
        description="Subject claim — user's email address.",
    )
    exp: Optional[int] = Field(
        default=None,
        description="Expiry timestamp (Unix epoch).",
    )
    iat: Optional[int] = Field(
        default=None,
        description="Issued-at timestamp (Unix epoch).",
    )
