"""
tests/test_teacher_analytics.py
-------------------------------
Tests for the teacher class-level analytics endpoint.
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

class TestTeacherAnalytics(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides[get_db] = override_get_db
        clean_test_db()
        self.client = TestClient(app)

        db = TestingSessionLocal()
        
        # 1. Create Teachers and Students
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
        
        self.student_token = create_access_token(data={"sub": "student_f3@test.com"})
        
        db.add_all([teacher_f3, student_f3, teacher_l6, student_l6])
        db.flush()

        # 2. Create Experiment & Submissions
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
        
        sub_f3 = Submission(
            student_id=student_f3.id,
            experiment_id=exp.id,
            status=SubmissionStatus.graded,
            automatic_score=80.0,
            final_score=85.0
        )
        sub_l6 = Submission(
            student_id=student_l6.id,
            experiment_id=exp.id,
            status=SubmissionStatus.graded,
            automatic_score=50.0,
            final_score=55.0
        )
        db.add_all([sub_f3, sub_l6])
        db.commit()
        db.close()

    def test_unauthenticated_access_rejected(self):
        res = self.client.get("/api/v1/teacher/analytics/class-performance")
        self.assertEqual(res.status_code, 401)

    def test_student_access_rejected(self):
        res = self.client.get(
            "/api/v1/teacher/analytics/class-performance",
            headers={"Authorization": f"Bearer {self.student_token}"}
        )
        self.assertEqual(res.status_code, 403)

    def test_teacher_sees_only_own_class(self):
        res = self.client.get(
            "/api/v1/teacher/analytics/class-performance",
            headers={"Authorization": f"Bearer {self.teacher_f3_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        # Should only see Student F3 (1 student)
        self.assertEqual(data["pagination"]["total_students"], 1)
        self.assertEqual(len(data["students"]), 1)
        self.assertEqual(data["students"][0]["class_level"], "Form3")
        self.assertEqual(data["students"][0]["average_score"], 85.0)

    def test_teacher_cannot_bypass_class_level(self):
        # Teacher F3 attempts to query L6 analytics
        res = self.client.get(
            "/api/v1/teacher/analytics/class-performance?class_level=L6",
            headers={"Authorization": f"Bearer {self.teacher_f3_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        # It should STILL only return Form3 students
        self.assertEqual(data["pagination"]["total_students"], 1)
        self.assertEqual(data["students"][0]["class_level"], "Form3")
