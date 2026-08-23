"""
app/api/v1/endpoints/auth.py
-----------------------------
Authentication endpoints for the Virtual Science Lab API.

Routes
------
  POST  /api/v1/auth/register  — Create a new user account
  POST  /api/v1/auth/login     — OAuth2 password flow → JWT token
  GET   /api/v1/auth/me        — Return authenticated user's profile
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.database import get_db
from app.models.user import User, UserRole
from app.schemas.token_schema import Token
from app.schemas.user_schema import UserCreate, UserRegister, UserResponse

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /register
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new student user",
    description=(
        "Creates a new student user account. Public registrations are strictly created "
        "with the **student** role. "
        "Duplicate email addresses are rejected with HTTP 409."
    ),
)
def register(
    payload: UserRegister,
    db: Session = Depends(get_db),
) -> UserResponse:
    # ── Duplicate check ────────────────────────────────────────────────
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{payload.email}' already exists.",
        )

    # ── Create user record (enforce student role) ───────────────────────
    new_user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.student,
        class_level=payload.class_level,
        subject_code=None,
        gender=payload.gender,
        is_active=True,
        is_verified=False,
    )
    db.add(new_user)
    db.flush()   # assign id before returning
    db.refresh(new_user)

    return new_user  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# POST /login  (OAuth2 password flow — works with Swagger UI + JSON clients)
# ---------------------------------------------------------------------------

@router.post(
    "/login",
    response_model=Token,
    summary="Login and obtain JWT access token",
    description=(
        "Accepts **OAuth2 form data** (`username` / `password` fields) so it "
        "works natively with the Swagger UI 'Authorize' button. "
        "The `username` field must be the user's email address."
    ),
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    # OAuth2PasswordRequestForm uses `username` — map it to email
    email = form_data.username.lower().strip()

    user: User | None = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact the administrator.",
        )

    access_token = create_access_token(data={"sub": user.email})

    return Token(access_token=access_token, token_type="bearer")


# ---------------------------------------------------------------------------
# GET /me
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get authenticated user's profile",
    description=(
        "Returns the full profile of the currently authenticated user. "
        "Requires a valid `Authorization: Bearer <token>` header."
    ),
)
def get_me(
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    return current_user  # type: ignore[return-value]
