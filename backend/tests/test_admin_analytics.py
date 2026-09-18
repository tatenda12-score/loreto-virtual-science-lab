import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.experiment import Experiment, ExperimentStatus, Subject
from app.models.submission import Submission, SubmissionStatus
from app.core.security import hash_password

def test_admin_analytics_unauthorized(client: TestClient, db: Session):
    # Test unauthenticated
    response = client.get("/api/v1/admin/analytics/student-performance")
    assert response.status_code == 401

    # Test student role
    student = User(
        full_name="Student", email="student@test.com",
        hashed_password=hash_password("pw"), role=UserRole.student
    )
    db.add(student)
    db.commit()
    
    # login as student
    resp = client.post("/api/v1/auth/login", data={"username": "student@test.com", "password": "pw"})
    token = resp.json()["access_token"]
    
    response = client.get("/api/v1/admin/analytics/student-performance", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403

def test_admin_analytics_success(client: TestClient, db: Session):
    # Setup admin
    admin = User(
        full_name="Admin", email="admin_analytics@test.com",
        hashed_password=hash_password("pw"), role=UserRole.admin
    )
    db.add(admin)
    db.commit()
    
    resp = client.post("/api/v1/auth/login", data={"username": "admin_analytics@test.com", "password": "pw"})
    token = resp.json()["access_token"]
    
    # Test valid response
    response = client.get("/api/v1/admin/analytics/student-performance", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "students" in data
    assert "pagination" in data
