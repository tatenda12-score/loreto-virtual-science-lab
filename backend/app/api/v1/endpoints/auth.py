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

from fastapi import APIRouter, Depends, HTTPException, status, Response
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

    # In a pure cookie-based flow, we wouldn't return the token in the body to prevent JS access.
    # However, to keep Swagger UI working, we can return it in the body for development.
    # The frontend is instructed to ignore the body token and rely on the HttpOnly cookie.
    return Token(access_token=access_token, token_type="bearer")

@router.post(
    "/login/cookie",
    summary="Login and set HttpOnly Cookie",
    description="Production login endpoint that sets an HttpOnly cookie.",
)
def login_cookie(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    email = form_data.username.lower().strip()
    user: User | None = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact the administrator.",
        )

    access_token = create_access_token(data={"sub": user.email})
    
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return {"detail": "Successfully logged in"}

@router.post(
    "/logout",
    summary="Logout",
    description="Clears the HttpOnly authentication cookie.",
)
def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        domain=settings.COOKIE_DOMAIN,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
    )
    return {"detail": "Successfully logged out"}



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
