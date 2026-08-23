"""
app/api/v1/router.py
--------------------
Aggregates all v1 feature routers into a single APIRouter that is
mounted in ``app/main.py`` under the ``/api/v1`` prefix.

Adding a new feature router
---------------------------
1. Create ``app/api/v1/endpoints/<feature>.py`` with an ``APIRouter``.
2. Import it here and call ``v1_router.include_router(...)``.
"""

from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.experiments import router as experiments_router
from app.api.v1.endpoints.submissions import router as submissions_router

# ---------------------------------------------------------------------------
# Root v1 router
# ---------------------------------------------------------------------------
v1_router = APIRouter()

# ── Auth ────────────────────────────────────────────────────────────────────
v1_router.include_router(
    auth_router,
    prefix="/auth",
    tags=["Authentication"],
)

# ── Experiments ─────────────────────────────────────────────────────────────
v1_router.include_router(
    experiments_router,
    prefix="/experiments",
    tags=["Experiments"],
)

# ── Submissions ──────────────────────────────────────────────────────────────
v1_router.include_router(
    submissions_router,
    prefix="/submissions",
    tags=["Submissions"],
)

# ── Future routers ───────────────────────────────────────────────────────────
# from app.api.v1.endpoints.users import router as users_router
# v1_router.include_router(users_router, prefix="/users", tags=["Users"])
