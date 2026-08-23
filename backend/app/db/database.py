"""
app/db/database.py
------------------
SQLAlchemy 2.0 engine, session factory, and declarative Base.

Usage
-----
    from app.db.database import Base, get_db

    # In a FastAPI route:
    def my_route(db: Session = Depends(get_db)):
        ...
"""

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

from app.core.config import settings


# ---------------------------------------------------------------------------
# Database URL Normalization (Render / SQLAlchemy compatibility)
# ---------------------------------------------------------------------------
raw_url = settings.DATABASE_URL
if raw_url.startswith("postgres://"):
    # SQLAlchemy 1.4+ / 2.0 requires postgresql:// instead of postgres://
    db_url = raw_url.replace("postgres://", "postgresql://", 1)
else:
    db_url = raw_url

is_sqlite = db_url.startswith("sqlite")

# ---------------------------------------------------------------------------
# Engine Configuration
# ---------------------------------------------------------------------------
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine_kwargs: dict = {
    "connect_args": connect_args,
    "echo": settings.is_development,  # log SQL only in development
    "future": True,                   # enables SQLAlchemy 2.0 style
    "pool_pre_ping": True,            # automatically re-connect disconnected sockets
}

if not is_sqlite:
    # Production PostgreSQL connection pool settings
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_recycle"] = 1800

engine = create_engine(db_url, **engine_kwargs)

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,      # avoid lazy-load errors after commit
)


# ---------------------------------------------------------------------------
# Declarative Base — all ORM models inherit from this
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    """
    Project-wide SQLAlchemy declarative base.

    All model classes must inherit from this `Base` so that
    `Base.metadata` contains every table definition — which Alembic
    needs to auto-generate migrations.
    """
    pass


# ---------------------------------------------------------------------------
# Dependency — FastAPI `Depends(get_db)`
# ---------------------------------------------------------------------------
def get_db() -> Generator[Session, None, None]:
    """
    Yield a database session for the lifetime of a single HTTP request,
    then close it automatically (even on exception).

    Example
    -------
        @router.get("/items")
        def list_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db: Session = SessionLocal()
    try:
        yield db
        db.commit()          # commit only if the handler raised no exceptions
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
