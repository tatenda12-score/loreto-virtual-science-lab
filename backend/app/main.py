"""
app/main.py
-----------
FastAPI application factory for the Virtual Science Laboratory System.

Run locally:
    cd backend
    uvicorn app.main:app --reload --port 8000

Production (Gunicorn + uvicorn workers):
    gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4 --bind 0.0.0.0:8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.DEBUG if settings.is_development else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown hooks
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Code before `yield` runs at startup; code after `yield` runs at shutdown.
    Use this hook for:
      - Verifying the database connection
      - Warming up ML models or cache
      - Graceful teardown of background workers
    """
    logger.info("🔬 Virtual Science Lab API starting up …")
    logger.info(f"   Environment : {settings.APP_ENV}")
    logger.info(f"   Version     : {settings.APP_VERSION}")

    # Ensure initial admin/demo users exist (idempotent startup initialization)
    try:
        from scripts.seed import run_seed
        run_seed()
    except Exception as exc:
        logger.warning(f"Startup initialization note: {exc}")

    yield
    logger.info("Virtual Science Lab API shutting down. Goodbye!")
    # Future: await database.disconnect() / redis_pool.close() etc.


# ---------------------------------------------------------------------------
# FastAPI application instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description=(
        "Backend API for the Loreto High School Virtual Science Laboratory System. "
        "Supports admin, teacher, and student roles with full experiment tracking."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Middleware (Outer to Inner: CORS wraps TrustedHost)
# ---------------------------------------------------------------------------

# 1. Trusted host — prevents Host-header injection attacks
if not settings.is_development and settings.ALLOWED_HOSTS and "*" not in settings.ALLOWED_HOSTS:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )

# 2. CORS — allow front-end origins defined in .env (outer layer to handle OPTIONS preflight)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global exception handler (catch-all)
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred. Please contact support.",
        },
    )


# ---------------------------------------------------------------------------
# Core routes (no version prefix — infrastructure-level endpoints)
# ---------------------------------------------------------------------------

@app.get(
    "/health",
    tags=["System"],
    summary="Health check",
    description=(
        "Lightweight liveness probe. Returns HTTP 200 and `status: ok` "
        "when the API process is running. Does **not** verify database connectivity."
    ),
    response_description="Service is alive",
)
async def health_check() -> dict:
    return {
        "status": "ok",
        "service": settings.APP_TITLE,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }


@app.get(
    "/health/db",
    tags=["System"],
    summary="Deep health check (DB)",
    description="Verifies that the API can reach the database.",
)
async def health_check_db() -> dict:
    from sqlalchemy import text
    from app.db.database import SessionLocal

    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "reachable"}
    except Exception as exc:
        logger.error(f"DB health check failed: {exc}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "unreachable"},
        )


@app.post(
    "/setup/seed",
    tags=["System"],
    summary="Initialize / Seed Database",
    description="Seeds default admin, teacher, and experiments idempotently.",
)
def setup_seed():
    try:
        from scripts.seed import run_seed
        run_seed()
        return {"status": "ok", "message": "Database seeded successfully. Admin credentials: admin@loreto.edu.ng / Demo123!"}
    except Exception as exc:
        logger.error(f"Setup seed failed: {exc}")
        return JSONResponse(status_code=500, content={"status": "error", "detail": str(exc)})


# ---------------------------------------------------------------------------
# API versioned routers
# ---------------------------------------------------------------------------
from app.api.v1.router import v1_router  # noqa: E402

app.include_router(v1_router, prefix="/api/v1")

# Future routers are added inside app/api/v1/router.py — not here.
