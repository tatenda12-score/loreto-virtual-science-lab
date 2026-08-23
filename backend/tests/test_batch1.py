"""
tests/test_batch1.py
--------------------
Focused test suite for Batch 1 security, RBAC, science engine, and data sanitization.

Test cases:
  A. Student cannot register as admin
  B. Student cannot register as teacher
  C. Student cannot see expected_values
  D. Student cannot see grading tolerance
  E. Teacher cannot edit another teacher's experiment
  F. Admin can edit another teacher's experiment
  G. Missing observation receives zero contribution
  H. Expected value zero does not crash grading
  I. Ohm's Law dynamic grading: 10V / 5Ω = 2A, Power = 20W
  J. Ohm's Law dynamic grading: 20V / 10Ω = 2A, Power = 40W
"""

import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base, get_db
from app.models.user import User, UserRole
from app.models.experiment import (
    Difficulty,
    Experiment,
    ExperimentStatus,
    SimulationType,
    Subject,
)
from app.core.security import hash_password, create_access_token
from app.services.science_engine import (
    evaluate_submission,
    grade_submission,
    grade_dynamic_ohms_law,
)

from tests.test_utils import clean_test_db, TestingSessionLocal


class TestBatch1(unittest.TestCase):
    def setUp(self):
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
        self.teacher2 = User(
            full_name="Teacher Two",
            email="teacher2@test.com",
            hashed_password=hash_password("Password123!"),
            role=UserRole.teacher,
            subject_code="CHM101",
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
        db.add_all([self.admin, self.teacher1, self.teacher2, self.student])
        db.commit()

        # Seed experiment created by teacher1
        self.exp1 = Experiment(
            title="Ohm's Law Experiment",
            subject=Subject.physics,
            difficulty=Difficulty.intermediate,
            simulation_type=SimulationType.ohms_law,
            status=ExperimentStatus.published,
            topic="Current Electricity",
            description="Verify V = IR circuit behavior.",
            instructions=[{"step": 1, "action": "Connect circuit"}],
            parameters={
                "simulation_type": "ohms_law",
                "voltage_V": 12.0,
                "resistance_ohm": 4.0,
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
        self.teacher1_id = int(self.teacher1.id)
        db.close()

        # JWT tokens
        self.admin_token = create_access_token(data={"sub": "admin@test.com"})
        self.teacher1_token = create_access_token(data={"sub": "teacher1@test.com"})
        self.teacher2_token = create_access_token(data={"sub": "teacher2@test.com"})
        self.student_token = create_access_token(data={"sub": "student@test.com"})

    # -----------------------------------------------------------------------
    # Requirement A & B: Registration Privilege Escalation Tests
    # -----------------------------------------------------------------------
    def test_a_student_cannot_register_as_admin(self):
        """A. Attempting to pass role='admin' in registration creates a student only."""
        payload = {
            "full_name": "Hacker Admin",
            "email": "hacker.admin@test.com",
            "password": "Password123!",
            "role": "admin",
            "class_level": "SS2",
        }
        res = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["role"], "student")
        self.assertNotEqual(data["role"], "admin")

    def test_b_student_cannot_register_as_teacher(self):
        """B. Attempting to pass role='teacher' in registration creates a student only."""
        payload = {
            "full_name": "Hacker Teacher",
            "email": "hacker.teacher@test.com",
            "password": "Password123!",
            "role": "teacher",
            "subject_code": "PHY999",
        }
        res = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["role"], "student")
        self.assertIsNone(data["subject_code"])

    # -----------------------------------------------------------------------
    # Requirement C & D: Experiment Sanitization Tests
    # -----------------------------------------------------------------------
    def test_c_and_d_student_cannot_see_expected_values_or_tolerance(self):
        """C & D. Student receives sanitized parameters without expected_values or tolerance."""
        headers = {"Authorization": f"Bearer {self.student_token}"}

        # Test single experiment GET /{id}
        res = self.client.get(f"/api/v1/experiments/{self.exp1_id}", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        params = data.get("parameters")
        if params:
            self.assertNotIn("expected_values", params)
            self.assertNotIn("tolerance", params)
            self.assertNotIn("grading_config", params)

        # Test list experiments GET /
        res_list = self.client.get("/api/v1/experiments/", headers=headers)
        self.assertEqual(res_list.status_code, 200)
        list_data = res_list.json()
        self.assertTrue(len(list_data) > 0)
        exp_item = list_data[0]
        if exp_item.get("parameters"):
            self.assertNotIn("expected_values", exp_item["parameters"])
            self.assertNotIn("tolerance", exp_item["parameters"])

        # Teacher CAN see full parameters including expected_values
        t_headers = {"Authorization": f"Bearer {self.teacher1_token}"}
        t_res = self.client.get(f"/api/v1/experiments/{self.exp1_id}", headers=t_headers)
        self.assertEqual(t_res.status_code, 200)
        t_data = t_res.json()
        self.assertIn("parameters", t_data)
        self.assertIn("expected_values", t_data["parameters"])
        self.assertIn("tolerance", t_data["parameters"])

    # -----------------------------------------------------------------------
    # Requirement E & F: Teacher Experiment Ownership Tests
    # -----------------------------------------------------------------------
    def test_e_teacher_cannot_edit_another_teachers_experiment(self):
        """E. Teacher 2 cannot modify experiment created by Teacher 1."""
        headers = {"Authorization": f"Bearer {self.teacher2_token}"}
        payload = {"title": "Hacked Title by Teacher 2"}
        res = self.client.patch(
            f"/api/v1/experiments/{self.exp1_id}", json=payload, headers=headers
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("not authorized", res.json()["detail"].lower())

    def test_f_admin_and_owner_can_edit_experiment(self):
        """F. Admin and original creator teacher can edit the experiment."""
        # Owner teacher modifies
        owner_headers = {"Authorization": f"Bearer {self.teacher1_token}"}
        res_owner = self.client.patch(
            f"/api/v1/experiments/{self.exp1_id}",
            json={"title": "Updated Title by Owner"},
            headers=owner_headers,
        )
        self.assertEqual(res_owner.status_code, 200)
        self.assertEqual(res_owner.json()["title"], "Updated Title by Owner")

        # Admin modifies
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        res_admin = self.client.patch(
            f"/api/v1/experiments/{self.exp1_id}",
            json={"title": "Updated Title by Admin"},
            headers=admin_headers,
        )
        self.assertEqual(res_admin.status_code, 200)
        self.assertEqual(res_admin.json()["title"], "Updated Title by Admin")

    # -----------------------------------------------------------------------
    # Requirement G: Missing Observations Score Penalty
    # -----------------------------------------------------------------------
    def test_g_missing_observation_receives_zero_contribution(self):
        """G. Missing required fields receive zero points and reduce final score."""
        params = {
            "expected_values": {
                "current_A": 3.0,
                "power_W": 36.0,
                "resistance_ohm": 4.0,
            },
            "tolerance": 0.05,
        }
        # Student only submits 1 of 3 required fields (perfect current_A)
        obs = {"current_A": 3.0}
        score = grade_submission(params, obs)
        # Expected: (100.0 + 0.0 + 0.0) / 3 = 33.33
        self.assertEqual(score, 33.33)

    # -----------------------------------------------------------------------
    # Requirement H: Zero Expected Value Handling
    # -----------------------------------------------------------------------
    def test_h_expected_value_zero_does_not_crash(self):
        """H. Zero expected value calculates mathematically safe score without division by zero."""
        # Exact match at zero -> 100%
        score_zero = evaluate_submission(expected_val=0.0, student_val=0.0, tolerance=0.05)
        self.assertEqual(score_zero, 100.0)

        # Within tolerance (0.025 with tolerance 0.05) -> 50%
        score_half = evaluate_submission(expected_val=0.0, student_val=0.025, tolerance=0.05)
        self.assertEqual(score_half, 50.0)

        # At or beyond tolerance (0.06 with tolerance 0.05) -> 0%
        score_out = evaluate_submission(expected_val=0.0, student_val=0.06, tolerance=0.05)
        self.assertEqual(score_out, 0.0)

    # -----------------------------------------------------------------------
    # Requirement I & J: Dynamic Ohm's Law Auto-Grading Tests
    # -----------------------------------------------------------------------
    def test_i_ohms_law_dynamic_grading_trial_1(self):
        """I. Ohm's Law: 10V / 5Ω = 2A, Power = 20W produces 100% score."""
        obs = {
            "voltage_V": 10.0,
            "resistance_ohm": 5.0,
            "current_A": 2.0,
            "power_W": 20.0,
        }
        score = grade_dynamic_ohms_law(obs, tolerance=0.05)
        self.assertEqual(score, 100.0)

        # Also test via full grade_submission endpoint flow
        exp_params = {
            "simulation_type": "ohms_law",
            "tolerance": 0.05,
            "expected_values": {"current_A": 3.0, "power_W": 36.0},  # static default in DB
        }
        full_score = grade_submission(exp_params, obs)
        self.assertEqual(full_score, 100.0)

    def test_j_ohms_law_dynamic_grading_trial_2(self):
        """J. Ohm's Law: 20V / 10Ω = 2A, Power = 40W produces 100% score."""
        obs = {
            "voltage_V": 20.0,
            "resistance_ohm": 10.0,
            "current_A": 2.0,
            "power_W": 40.0,
        }
        score = grade_dynamic_ohms_law(obs, tolerance=0.05)
        self.assertEqual(score, 100.0)

        exp_params = {
            "simulation_type": "ohms_law",
            "tolerance": 0.05,
        }
        full_score = grade_submission(exp_params, obs)
        self.assertEqual(full_score, 100.0)

    # -----------------------------------------------------------------------
    # End-to-End Submission API Workflow Test
    # -----------------------------------------------------------------------
    def test_k_full_ohms_law_submission_api_flow(self):
        """Verify student submission endpoint successfully auto-grades dynamic Ohm's Law."""
        headers = {"Authorization": f"Bearer {self.student_token}"}
        payload = {
            "experiment_id": self.exp1_id,
            "recorded_observations": {
                "voltage_V": 18.0,
                "resistance_ohm": 6.0,
                "current_A": 3.0,
                "power_W": 54.0,
            },
        }
        res = self.client.post("/api/v1/submissions/", json=payload, headers=headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["status"], "submitted")
        self.assertEqual(data["calculated_score"], 100.0)
        self.assertEqual(data["student_id"], self.student_id)

    # -----------------------------------------------------------------------
    # Health Check Sanitization Test
    # -----------------------------------------------------------------------
    def test_l_health_check_sanitization(self):
        """Verify /health and /health/db endpoints return clean, safe responses."""
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

        res_db = self.client.get("/health/db")
        self.assertEqual(res_db.status_code, 200)
        self.assertEqual(res_db.json()["status"], "ok")


if __name__ == "__main__":
    unittest.main()
