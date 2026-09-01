"""
app/api/deps.py
---------------
Reusable FastAPI dependency functions.

Key dependencies
----------------
  get_current_user       — decode JWT → fetch User from DB → validate active
  get_current_active_user — alias used in most endpoints
  require_roles(...)     — factory that produces a role-checking Depends()

Usage example
-------------
    from app.api.deps import get_current_user, require_roles
    from app.models.user import UserRole

    @router.get("/admin-only")
    def admin_panel(
        current_user: User = Depends(require_roles(UserRole.admin)),
    ):
        ...
"""

from typing import Callable

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.user import User, UserRole
from app.schemas.token_schema import TokenPayload

# ---------------------------------------------------------------------------
# OAuth2 scheme — clients must POST to /api/v1/auth/login to obtain a token,
# then include it as `Authorization: Bearer <token>` on protected routes.
# ---------------------------------------------------------------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ---------------------------------------------------------------------------
# Core user dependency
# ---------------------------------------------------------------------------

def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """
    Validate the bearer token from the `access_token` cookie (preferred) or Authorization header,
    and return the authenticated User object.

    Raises
    ------
    HTTP 401  if the token is missing, expired, or tampered with.
    HTTP 401  if the ``sub`` claim doesn't match any user in the database.
    HTTP 403  if the account is deactivated (``is_active=False``).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = request.cookies.get("access_token")
    if not token:
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
        else:
            raise credentials_exception
    else:
        # If it comes from cookie, it might have "Bearer " prefix if we saved it that way
        if token.startswith("Bearer "):
            token = token.split(" ")[1]

    try:
        payload = decode_access_token(token)
        token_data = TokenPayload(**payload)
    except (JWTError, ValueError):
        raise credentials_exception

    if token_data.sub is None:
        raise credentials_exception

    user: User | None = (
        db.query(User).filter(User.email == token_data.sub).first()
    )
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact the administrator.",
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Thin alias for ``get_current_user`` — use this in most endpoints.
    Kept separate so additional active-user logic can be added later
    without touching every route.
    """
    return current_user


# ---------------------------------------------------------------------------
# RBAC dependency factory
# ---------------------------------------------------------------------------

def require_roles(*allowed_roles: UserRole) -> Callable:
    """
    Return a FastAPI dependency that enforces role-based access control.

    Parameters
    ----------
    *allowed_roles:
        One or more ``UserRole`` values that are permitted to access the route.

    Returns
    -------
    Callable
        A dependency function that resolves to the authenticated ``User``
        object if the role check passes, or raises HTTP 403 otherwise.

    Example
    -------
        @router.post("/experiments")
        def create_experiment(
            payload: ExperimentCreate,
            current_user: User = Depends(require_roles(UserRole.teacher, UserRole.admin)),
            db: Session = Depends(get_db),
        ):
            ...
    """

    def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in allowed_roles:
            allowed_names = " | ".join(r.value for r in allowed_roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. This action requires role(s): {allowed_names}. "
                    f"Your role is '{current_user.role.value}'."
                ),
            )
        return current_user

    return role_checker
