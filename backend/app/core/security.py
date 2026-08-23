"""
app/core/security.py
--------------------
Centralised cryptographic utilities for the Virtual Science Lab API.

Responsibilities
----------------
  1. Password hashing & verification  (passlib + bcrypt)
  2. JWT access-token creation        (python-jose + HS256)
  3. JWT access-token decoding        (used by auth dependency)

Nothing in this module talks to the database — it is pure crypto.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# ---------------------------------------------------------------------------
# Passlib context — bcrypt is the recommended algorithm for passwords.
# `deprecated="auto"` will auto-upgrade legacy hashes on next login.
# ---------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Password helpers ────────────────────────────────────────────────────────

def hash_password(plain_password: str) -> str:
    """Return the bcrypt hash of *plain_password*."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Return True if *plain_password* matches *hashed_password*.

    Uses a constant-time comparison internally — safe against timing attacks.
    """
    return pwd_context.verify(plain_password, hashed_password)


# ── JWT helpers ─────────────────────────────────────────────────────────────

def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """
    Encode *data* as a signed JWT access token.

    Parameters
    ----------
    data:
        Payload to embed.  Must include a ``sub`` key (subject = user id or email).
    expires_delta:
        Custom TTL.  Falls back to ``settings.ACCESS_TOKEN_EXPIRE_MINUTES``.

    Returns
    -------
    str
        Compact, URL-safe JWT string.
    """
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and verify *token*.

    Raises
    ------
    jose.JWTError
        If the token is expired, tampered with, or otherwise invalid.
        Callers (e.g. ``get_current_user``) should catch this and raise
        HTTP 401.
    """
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )
