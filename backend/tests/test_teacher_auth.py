"""
tests/test_teacher_auth.py
--------------------------
Tests for teacher account creation, password changes, and class-level submission isolation.
"""

import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User, UserRole
from app.models.experiment import Experiment, Subject, Difficulty, SimulationType, ExperimentStatus
from app.models.submission import Submission, SubmissionStatus
from tests.test_utils import clean_test_db, TestingSessionLocal, override_get_db
from app.db.database import get_db
from app.core.security import hash_password, create_access_token

class TestTeacherAuth(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides[get_db] = override_get_db
        clean_test_db()
        self.client = TestClient(app)

        db = TestingSessionLocal()
        
        # 1. Create Admin
        self.admin_token = create_access_token(data={"sub": "admin@test.com"})
        admin = User(
            full_name="Admin User",
            email="admin@test.com",
            hashed_password=hash_password("Password123!"),
            role=UserRole.admin,
            is_active=True,
            is_verified=True,
        )
        
        # 2. Create L6 Teacher and Student
        self.teacher_l6_token = create_access_token(data={"sub": "teacher_l6@test.com"})
        teacher_l6 = User(
            full_name="Teacher L6",
            email="teacher_l6@test.com",
            hashed_password=hash_password("Password123!"),
            role=UserRole.teacher,
            class_level="L6",
            is_active=True,
            is_verified=True,
        )
        
        student_l6 = User(
            full_name="Student L6",
            email="student_l6@test.com",
            hashed_password=hash_password("Password123!"),
            role=UserRole.student,
            class_level="L6",
            is_active=True,
            is_verified=True,
        )
        
        # 3. Create Form3 Teacher and Student
        self.teacher_f3_token = create_access_token(data={"sub": "teacher_f3@test.com"})
        teacher_f3 = User(
            full_name="Teacher F3",
            email="teacher_f3@test.com",
            hashed_password=hash_password("Password123!"),
            role=UserRole.teacher,
            class_level="Form3",
            is_active=True,
            is_verified=True,
        )
        
        student_f3 = User(
            full_name="Student F3",
            email="student_f3@test.com",
            hashed_password=hash_password("Password123!"),
            role=UserRole.student,
            class_level="Form3",
            is_active=True,
            is_verified=True,
        )
        
        db.add_all([admin, teacher_l6, student_l6, teacher_f3, student_f3])
        db.flush()

        # 4. Create an experiment and submissions
        exp = Experiment(
            title="General Experiment",
            subject=Subject.physics,
            difficulty=Difficulty.intermediate,
            simulation_type=SimulationType.ohms_law,
            status=ExperimentStatus.published,
            description="A test description.",
            parameters={},
            created_by=teacher_l6.id,
        )
        db.add(exp)
        db.flush()
        
        sub_l6 = Submission(
            student_id=student_l6.id,
            experiment_id=exp.id,
            status=SubmissionStatus.submitted,
        )
        sub_f3 = Submission(
            student_id=student_f3.id,
            experiment_id=exp.id,
            status=SubmissionStatus.submitted,
        )
        
        db.add_all([sub_l6, sub_f3])
        db.flush()
        
        self.sub_l6_id = sub_l6.id
        self.sub_f3_id = sub_f3.id
        
        db.commit()
        db.close()

    def test_teacher_creation_allows_science_password(self):
        payload = {
            "full_name": "New Teacher",
            "email": "new_teacher@test.com",
            "password": "science",
            "subject_code": "BIO101",
            "gender": "Female",
            "class_level": "Form4"
        }
        res = self.client.post(
            "/api/v1/admin/users/teacher",
            json=payload,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        if res.status_code != 201:
            print("VALIDATION ERROR:", res.json())
        self.assertEqual(res.status_code, 201)
        
    def test_teacher_can_change_password(self):
        payload = {
            "current_password": "Password123!",
            "new_password": "NewStrongPassword123!"
        }
        res = self.client.patch(
            "/api/v1/auth/password",
            json=payload,
            headers={"Authorization": f"Bearer {self.teacher_l6_token}"}
        )
        self.assertEqual(res.status_code, 200)

    def test_teacher_submission_isolation(self):
        # Teacher L6 should be able to view Sub L6
        res = self.client.get(
            f"/api/v1/submissions/{self.sub_l6_id}",
            headers={"Authorization": f"Bearer {self.teacher_l6_token}"}
        )
        self.assertEqual(res.status_code, 200)
        
        # Teacher L6 should NOT be able to view Sub F3
        res = self.client.get(
            f"/api/v1/submissions/{self.sub_f3_id}",
            headers={"Authorization": f"Bearer {self.teacher_l6_token}"}
        )
        self.assertEqual(res.status_code, 403)
        
        # Teacher F3 should NOT be able to view Sub L6
        res = self.client.get(
            f"/api/v1/submissions/{self.sub_l6_id}",
            headers={"Authorization": f"Bearer {self.teacher_f3_token}"}
        )
        self.assertEqual(res.status_code, 403)
