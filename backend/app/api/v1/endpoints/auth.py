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

import hashlib

from app.api.deps import get_current_active_user
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.database import get_db
from app.models.user import User, UserRole
from app.schemas.token_schema import Token
from app.schemas.user_schema import (
    UserCreate,
    UserPasswordUpdate,
    UserRegister,
    UserResponse,
    SecurityQuestionsRequest,
    SecurityQuestionsResponse,
    PasswordResetWithQuestions,
)

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

    # ── Hash security answers (if provided) ────────────────────────────
    ans_1_hash = None
    if payload.security_answer_1 and payload.security_answer_1.strip():
        ans_1_hash = hashlib.sha256(payload.security_answer_1.strip().lower().encode("utf-8")).hexdigest()

    ans_2_hash = None
    if payload.security_answer_2 and payload.security_answer_2.strip():
        ans_2_hash = hashlib.sha256(payload.security_answer_2.strip().lower().encode("utf-8")).hexdigest()

    # ── Create user record (enforce student role) ───────────────────────
    new_user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.student,
        class_level=payload.class_level,
        subject_code=None,
        gender=payload.gender,
        security_question_1=payload.security_question_1,
        security_answer_1_hash=ans_1_hash,
        security_question_2=payload.security_question_2,
        security_answer_2_hash=ans_2_hash,
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

def _resolve_user(db: Session, username_input: str) -> User | None:
    raw = username_input.lower().strip()
    candidates = [raw]
    if raw in ("admin.co.zw", "admin@admin.co.zw", "admin"):
        candidates.extend(["admin@loreto.co.zw", "admin@loreto.edu.ng"])
    elif raw.endswith("@loreto.co.zw"):
        candidates.append(raw.replace("@loreto.co.zw", "@loreto.edu.ng"))
    elif raw.endswith("@loreto.edu.ng"):
        candidates.append(raw.replace("@loreto.edu.ng", "@loreto.co.zw"))
    return db.query(User).filter(User.email.in_(candidates)).first()


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
    user: User | None = _resolve_user(db, form_data.username)

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
    user: User | None = _resolve_user(db, form_data.username)

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
    
    # Starlette requires secure=True when samesite='none'
    is_secure = True if settings.COOKIE_SAMESITE.lower() == "none" else settings.COOKIE_SECURE

    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=is_secure,
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
    is_secure = True if settings.COOKIE_SAMESITE.lower() == "none" else settings.COOKIE_SECURE
    response.delete_cookie(
        key="access_token",
        domain=settings.COOKIE_DOMAIN,
        samesite=settings.COOKIE_SAMESITE,
        secure=is_secure,
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

# ---------------------------------------------------------------------------
# PATCH /password
# ---------------------------------------------------------------------------
@router.patch(
    "/password",
    summary="Change user password",
    description="Allows an authenticated user to change their own password.",
)
def change_password(
    payload: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password.",
        )
    
    current_user.hashed_password = hash_password(payload.new_password)
    db.flush()
    db.refresh(current_user)
    return {"detail": "Password successfully updated"}


# ---------------------------------------------------------------------------
# POST /forgot-password/questions — Fetch user security questions
# ---------------------------------------------------------------------------
@router.post(
    "/forgot-password/questions",
    response_model=SecurityQuestionsResponse,
    summary="Fetch security questions for password recovery",
    description="Returns configured security questions for an account without revealing answers.",
)
def get_security_questions(
    payload: SecurityQuestionsRequest,
    db: Session = Depends(get_db),
) -> SecurityQuestionsResponse:
    user: User | None = _resolve_user(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email or username.",
        )

    questions = []
    if user.security_question_1:
        questions.append(user.security_question_1)
    if user.security_question_2:
        questions.append(user.security_question_2)

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No security recovery questions were configured for this account. Please contact your school administrator.",
        )

    return SecurityQuestionsResponse(email=user.email, questions=questions)


# ---------------------------------------------------------------------------
# POST /forgot-password/reset — Reset password by answering security questions
# ---------------------------------------------------------------------------
@router.post(
    "/forgot-password/reset",
    summary="Reset password with security answers",
    description="Validates security question answers and updates user password.",
)
def reset_password_with_questions(
    payload: PasswordResetWithQuestions,
    db: Session = Depends(get_db),
):
    user: User | None = _resolve_user(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email or username.",
        )

    # Validate answers
    if user.security_answer_1_hash:
        if not payload.answers or len(payload.answers) < 1 or not payload.answers[0].strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security answer 1 is required.",
            )
        cand_hash_1 = hashlib.sha256(payload.answers[0].strip().lower().encode("utf-8")).hexdigest()
        if cand_hash_1 != user.security_answer_1_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect security answer.",
            )

    if user.security_answer_2_hash:
        if len(payload.answers) < 2 or not payload.answers[1].strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security answer 2 is required.",
            )
        cand_hash_2 = hashlib.sha256(payload.answers[1].strip().lower().encode("utf-8")).hexdigest()
        if cand_hash_2 != user.security_answer_2_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect security answer.",
            )

    # All answers matched — set new password
    user.hashed_password = hash_password(payload.new_password)
    db.flush()
    db.commit()

    return {"status": "ok", "message": "Password reset successfully. You can now log in with your new password."}
