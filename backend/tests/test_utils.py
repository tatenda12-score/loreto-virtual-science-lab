"""
tests/test_utils.py
-------------------
Shared database engine, sessionmaker, and test dependency override.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.database import Base, get_db
from app.main import app

from app.models.user import User
from app.models.experiment import Experiment
from app.models.submission import Submission

# Dedicated test SQLite database file
TEST_DATABASE_URL = "sqlite:///./test_loreto.db"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, expire_on_commit=False, bind=test_engine
)


def init_test_db():
    Base.metadata.create_all(bind=test_engine)


import sqlalchemy as sa


def clean_test_db():
    init_test_db()
    with test_engine.begin() as conn:
        conn.execute(sa.text("DELETE FROM submissions"))
        conn.execute(sa.text("DELETE FROM experiments"))
        conn.execute(sa.text("DELETE FROM users"))


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# Install the override once globally for test executions
app.dependency_overrides[get_db] = override_get_db
init_test_db()
