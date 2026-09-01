"""
tests/test_security.py
----------------------
Security regression tests for Phase 1 Hardening.
"""

import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User, UserRole
from tests.test_utils import clean_test_db, TestingSessionLocal, override_get_db
from app.db.database import get_db
from app.core.security import hash_password, create_access_token
from app.models.experiment import Experiment, Subject, Difficulty, SimulationType, ExperimentStatus

class TestSecurityHardening(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides[get_db] = override_get_db
        clean_test_db()
        self.client = TestClient(app)

        db = TestingSessionLocal()
        # Seed test users
        self.admin = User(
            full_name="Admin User",
            email="admin@test.com",
            hashed_password=hash_password("Password123!"),
            role=UserRole.admin,
            is_active=True,
            is_verified=True,
        )
        self.teacher1 = User(
            full_name="Teacher One",
            email="teacher1@test.com",
            hashed_password=hash_password("Password123!"),
            role=UserRole.teacher,
            subject_code="PHY101",
            is_active=True,
            is_verified=True,
        )
        self.student = User(
            full_name="Student One",
            email="student@test.com",
            hashed_password=hash_password("Password123!"),
            role=UserRole.student,
            class_level="SS2",
            is_active=True,
            is_verified=True,
        )
        db.add_all([self.admin, self.teacher1, self.student])
        db.commit()
        
        self.exp1 = Experiment(
            title="Ohm's Law Experiment",
            subject=Subject.physics,
            difficulty=Difficulty.intermediate,
            simulation_type=SimulationType.ohms_law,
            status=ExperimentStatus.published,
            description="Verify V = IR circuit behavior.",
            parameters={
                "simulation_type": "ohms_law",
                "expected_values": {"current_A": 3.0, "power_W": 36.0},
                "tolerance": 0.05,
            },
            created_by=self.teacher1.id,
        )
        db.add(self.exp1)
        db.commit()
        db.refresh(self.exp1)
        self.exp1_id = int(self.exp1.id)
        self.student_id = int(self.student.id)
        db.close()
        
        self.student_token = create_access_token(data={"sub": "student@test.com"})

    def test_registration_prevents_role_escalation(self):
        """
        Ensure that a user registering with `role=admin` is still created as a student,
        or the request is ignored/rejected if invalid.
        """
        payload = {
            "full_name": "Test Attacker",
            "email": "attacker@loreto.edu.ng",
            "password": "StrongPassword123!",
            "role": "admin"  # Malicious attempt
        }
        
        response = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(response.status_code, 201)
        
        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == "attacker@loreto.edu.ng").first()
        self.assertIsNotNone(user)
        self.assertEqual(user.role, UserRole.student)
        db.close()

    def test_student_cannot_grade(self):
        """
        Ensure that a student cannot grade a submission.
        """
        # Create a submission
        headers = {"Authorization": f"Bearer {self.student_token}"}
        sub_payload = {
            "experiment_id": self.exp1_id,
            "recorded_observations": {"current_A": 3.0},
        }
        res = self.client.post("/api/v1/submissions/", json=sub_payload, headers=headers)
        sub_id = res.json()["id"]

        # Student tries to grade
        grade_payload = {"final_score": 100, "teacher_feedback": "Looks good"}
        res2 = self.client.patch(f"/api/v1/submissions/{sub_id}/grade", json=grade_payload, headers=headers)
        self.assertEqual(res2.status_code, 403) # Must be teacher or admin

    def test_student_cannot_see_expected_values(self):
        """
        Ensure that a student fetching an experiment does not see 'expected_values' or 'tolerance'.
        """
        headers = {"Authorization": f"Bearer {self.student_token}"}
        res = self.client.get(f"/api/v1/experiments/{self.exp1_id}", headers=headers)
        self.assertEqual(res.status_code, 200)
        params = res.json().get("parameters", {})
        self.assertNotIn("expected_values", params)
        self.assertNotIn("tolerance", params)

    def test_client_cannot_submit_fake_score(self):
        """
        Ensure that final_score in POST /submissions/ is ignored.
        """
        headers = {"Authorization": f"Bearer {self.student_token}"}
        sub_payload = {
            "experiment_id": self.exp1_id,
            "recorded_observations": {"current_A": 1.0}, # Completely wrong answer
            "final_score": 100.0, # Attacker tries to inject score
        }
        res = self.client.post("/api/v1/submissions/", json=sub_payload, headers=headers)
        self.assertEqual(res.status_code, 201)
        # Verify score is not 100
        self.assertNotEqual(res.json().get("final_score"), 100.0)

if __name__ == "__main__":
    unittest.main()
