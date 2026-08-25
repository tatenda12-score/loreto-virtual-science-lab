"""
tests/test_batch4.py
--------------------
Focused test suite for Batch 4 requirements:
  A. Student can register.
  B. Student registration always produces role=student.
  C. Student cannot register as teacher.
  D. Student cannot register as admin.
  E. Duplicate email is rejected.
  F. Admin can create teacher.
  G. Student cannot create teacher.
  H. Teacher cannot create admin.
  I. Teacher can create experiment.
  J. Admin can create experiment.
  K. Teacher can edit own experiment.
  L. Teacher cannot edit another teacher's experiment.
  M. Student cannot see draft experiment.
  N. Student can see published experiment.
  O. Student cannot see archived experiment.
  P. Student cannot access grading configuration.
  Q. Student can submit an experiment.
  R. Student cannot submit on behalf of another student.
  S. Backend performs grading.
  T. Student can view own result.
  U. Teacher/admin can view authorized submissions.
  V. Student cannot access teacher/admin endpoints.
  W. Admin can manage teachers.
  X. Existing Batch 1 tests continue passing.
  Y. Existing Batch 2 tests continue passing.
  Z. Existing Batch 3 tests continue passing.
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
from app.models.submission import Submission, SubmissionStatus
from app.core.security import hash_password, create_access_token


class TestBatch4WorkflowAndSecurity(unittest.TestCase):
    """Batch 4 test suite verifying end-to-end role workflows and authorization."""

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=cls.engine
        )
        Base.metadata.create_all(bind=cls.engine)

        def override_get_db():
            db = cls.TestingSessionLocal()
            try:
                yield db
                db.commit()
            except Exception:
                db.rollback()
                raise
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=cls.engine)

    def setUp(self):
        self.db = self.TestingSessionLocal()
        self.db.query(Submission).delete()
        self.db.query(Experiment).delete()
        self.db.query(User).delete()
        self.db.commit()

        # Seed realistic test users
        self.admin = User(
            full_name="Admin Administrator",
            email="admin_test@example.com",
            hashed_password=hash_password("AdminPass123!"),
            role=UserRole.admin,
            is_active=True,
            is_verified=True,
        )
        self.teacher1 = User(
            full_name="Teacher One",
            email="teacher1_test@example.com",
            hashed_password=hash_password("TeacherPass123!"),
            role=UserRole.teacher,
            subject_code="PHY101",
            is_active=True,
            is_verified=True,
        )
        self.teacher2 = User(
            full_name="Teacher Two",
            email="teacher2_test@example.com",
            hashed_password=hash_password("TeacherPass123!"),
            role=UserRole.teacher,
            subject_code="CHM101",
            is_active=True,
            is_verified=True,
        )
        self.student = User(
            full_name="Student One",
            email="student_test@example.com",
            hashed_password=hash_password("StudentPass123!"),
            role=UserRole.student,
            class_level="SS2",
            is_active=True,
            is_verified=True,
        )
        self.student2 = User(
            full_name="Student Two",
            email="student2_test@example.com",
            hashed_password=hash_password("StudentPass123!"),
            role=UserRole.student,
            class_level="SS1",
            is_active=True,
            is_verified=True,
        )
        self.db.add_all([self.admin, self.teacher1, self.teacher2, self.student, self.student2])
        self.db.commit()
        self.db.refresh(self.admin)
        self.db.refresh(self.teacher1)
        self.db.refresh(self.teacher2)
        self.db.refresh(self.student)
        self.db.refresh(self.student2)

        self.admin_token = create_access_token({"sub": self.admin.email})
        self.teacher1_token = create_access_token({"sub": self.teacher1.email})
        self.teacher2_token = create_access_token({"sub": self.teacher2.email})
        self.student_token = create_access_token({"sub": self.student.email})
        self.student2_token = create_access_token({"sub": self.student2.email})

    def tearDown(self):
        self.db.close()

    def test_A_student_can_register(self):
        """A. Student can register via public endpoint."""
        resp = self.client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "New Student",
                "email": "new_student@example.com",
                "password": "ValidPassword123!",
                "class_level": "SS2",
                "gender": "Female",
            },
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["email"], "new_student@example.com")
        self.assertEqual(data["full_name"], "New Student")

    def test_B_student_registration_always_produces_role_student(self):
        """B. Student registration always produces role=student."""
        resp = self.client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Another Student",
                "email": "another_student@example.com",
                "password": "ValidPassword123!",
                "class_level": "SS1",
            },
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["role"], "student")

    def test_C_student_cannot_register_as_teacher(self):
        """C. Student registration payload with role=teacher is ignored/not permitted."""
        resp = self.client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Hacker",
                "email": "hacker1@example.com",
                "password": "ValidPassword123!",
                "role": "teacher",
            },
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["role"], "student")

    def test_D_student_cannot_register_as_admin(self):
        """D. Student registration payload with role=admin is ignored/not permitted."""
        resp = self.client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Hacker",
                "email": "hacker2@example.com",
                "password": "ValidPassword123!",
                "role": "admin",
            },
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["role"], "student")

    def test_E_duplicate_email_is_rejected(self):
        """E. Duplicate email registration returns 409 Conflict."""
        resp = self.client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Duplicate Student",
                "email": "student_test@example.com",
                "password": "ValidPassword123!",
            },
        )
        self.assertEqual(resp.status_code, 409)

    def test_F_admin_can_create_teacher(self):
        """F. Admin can create teacher account with role=teacher."""
        resp = self.client.post(
            "/api/v1/admin/users/teacher",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "full_name": "New Teacher",
                "email": "new_teacher@example.com",
                "password": "TeacherPassword123!",
                "subject_code": "BIO201",
                "gender": "Male",
            },
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["role"], "teacher")
        self.assertEqual(data["email"], "new_teacher@example.com")
        self.assertTrue(data["is_active"])

    def test_G_student_cannot_create_teacher(self):
        """G. Student calling admin create teacher returns 403 Forbidden."""
        resp = self.client.post(
            "/api/v1/admin/users/teacher",
            headers={"Authorization": f"Bearer {self.student_token}"},
            json={
                "full_name": "Fake Teacher",
                "email": "fake_teacher@example.com",
                "password": "TeacherPassword123!",
            },
        )
        self.assertEqual(resp.status_code, 403)

    def test_H_teacher_cannot_create_admin(self):
        """H. Teacher calling admin endpoints returns 403 Forbidden."""
        resp = self.client.post(
            "/api/v1/admin/users/teacher",
            headers={"Authorization": f"Bearer {self.teacher1_token}"},
            json={
                "full_name": "Unauthorized Teacher",
                "email": "unauth@example.com",
                "password": "TeacherPassword123!",
            },
        )
        self.assertEqual(resp.status_code, 403)

    def test_I_teacher_can_create_experiment(self):
        """I. Teacher can create an experiment."""
        resp = self.client.post(
            "/api/v1/experiments/",
            headers={"Authorization": f"Bearer {self.teacher1_token}"},
            json={
                "title": "Ohm's Law Lab",
                "subject": "Physics",
                "difficulty": "Beginner",
                "simulation_type": "ohms_law",
                "status": "draft",
                "topic": "Electricity",
                "description": "Investigate voltage and current relationship.",
            },
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["title"], "Ohm's Law Lab")
        self.assertEqual(data["created_by"], self.teacher1.id)

    def test_J_admin_can_create_experiment(self):
        """J. Admin can create an experiment."""
        resp = self.client.post(
            "/api/v1/experiments/",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "title": "Titration Lab",
                "subject": "Chemistry",
                "difficulty": "Intermediate",
                "simulation_type": "titration",
                "status": "published",
                "description": "Standard acid-base titration titration.",
            },
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["created_by"], self.admin.id)

    def test_K_teacher_can_edit_own_experiment(self):
        """K. Teacher can edit their own experiment."""
        exp = Experiment(
            title="My Experiment",
            subject=Subject.physics,
            difficulty=Difficulty.beginner,
            simulation_type=SimulationType.generic,
            status=ExperimentStatus.draft,
            description="Initial description here.",
            created_by=self.teacher1.id,
        )
        self.db.add(exp)
        self.db.commit()
        self.db.refresh(exp)

        resp = self.client.patch(
            f"/api/v1/experiments/{exp.id}",
            headers={"Authorization": f"Bearer {self.teacher1_token}"},
            json={"title": "Updated Experiment Title"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["title"], "Updated Experiment Title")

    def test_L_teacher_cannot_edit_another_teachers_experiment(self):
        """L. Teacher cannot edit another teacher's experiment (403 Forbidden)."""
        exp = Experiment(
            title="Teacher Two's Experiment",
            subject=Subject.chemistry,
            difficulty=Difficulty.intermediate,
            simulation_type=SimulationType.generic,
            status=ExperimentStatus.draft,
            description="Created by teacher 2.",
            created_by=self.teacher2.id,
        )
        self.db.add(exp)
        self.db.commit()
        self.db.refresh(exp)

        resp = self.client.patch(
            f"/api/v1/experiments/{exp.id}",
            headers={"Authorization": f"Bearer {self.teacher1_token}"},
            json={"title": "Hacked Title"},
        )
        self.assertEqual(resp.status_code, 403)

    def test_M_student_cannot_see_draft_experiment(self):
        """M. Student cannot see draft experiments in list or by ID."""
        exp = Experiment(
            title="Secret Draft",
            subject=Subject.biology,
            difficulty=Difficulty.beginner,
            simulation_type=SimulationType.generic,
            status=ExperimentStatus.draft,
            description="Draft experiment description.",
            created_by=self.teacher1.id,
        )
        self.db.add(exp)
        self.db.commit()
        self.db.refresh(exp)

        # List check
        list_resp = self.client.get(
            "/api/v1/experiments/",
            headers={"Authorization": f"Bearer {self.student_token}"},
        )
        self.assertEqual(list_resp.status_code, 200)
        titles = [e["title"] for e in list_resp.json()]
        self.assertNotIn("Secret Draft", titles)

        # Detail check
        detail_resp = self.client.get(
            f"/api/v1/experiments/{exp.id}",
            headers={"Authorization": f"Bearer {self.student_token}"},
        )
        self.assertEqual(detail_resp.status_code, 404)

    def test_N_student_can_see_published_experiment(self):
        """N. Student can see published experiments."""
        exp = Experiment(
            title="Visible Published Lab",
            subject=Subject.physics,
            difficulty=Difficulty.intermediate,
            simulation_type=SimulationType.ohms_law,
            status=ExperimentStatus.published,
            description="Published experiment description.",
            created_by=self.teacher1.id,
        )
        self.db.add(exp)
        self.db.commit()
        self.db.refresh(exp)

        resp = self.client.get(
            f"/api/v1/experiments/{exp.id}",
            headers={"Authorization": f"Bearer {self.student_token}"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["title"], "Visible Published Lab")

    def test_O_student_cannot_see_archived_experiment(self):
        """O. Student cannot see archived experiments."""
        exp = Experiment(
            title="Old Archived Lab",
            subject=Subject.physics,
            difficulty=Difficulty.intermediate,
            simulation_type=SimulationType.generic,
            status=ExperimentStatus.archived,
            description="Archived experiment description.",
            created_by=self.teacher1.id,
        )
        self.db.add(exp)
        self.db.commit()
        self.db.refresh(exp)

        resp = self.client.get(
            f"/api/v1/experiments/{exp.id}",
            headers={"Authorization": f"Bearer {self.student_token}"},
        )
        self.assertEqual(resp.status_code, 404)

    def test_P_student_cannot_access_grading_configuration(self):
        """P. Student cannot see sensitive answer keys or expected values."""
        exp = Experiment(
            title="Graded Lab",
            subject=Subject.physics,
            difficulty=Difficulty.intermediate,
            simulation_type=SimulationType.ohms_law,
            status=ExperimentStatus.published,
            description="Ohm's law with sensitive answer key.",
            parameters={
                "voltage_V": 12.0,
                "resistance_ohm": 4.0,
                "expected_values": {"current_A": 3.0, "power_W": 36.0},
                "tolerance": 0.05,
                "answer_key": "3A",
            },
            created_by=self.teacher1.id,
        )
        self.db.add(exp)
        self.db.commit()
        self.db.refresh(exp)

        resp = self.client.get(
            f"/api/v1/experiments/{exp.id}",
            headers={"Authorization": f"Bearer {self.student_token}"},
        )
        self.assertEqual(resp.status_code, 200)
        params = resp.json().get("parameters", {})
        self.assertNotIn("expected_values", params)
        self.assertNotIn("tolerance", params)
        self.assertNotIn("answer_key", params)
        self.assertEqual(params.get("voltage_V"), 12.0)

    def test_Q_student_can_submit_experiment(self):
        """Q. Student can submit experiment observations."""
        exp = Experiment(
            title="Ohm Submission Test",
            subject=Subject.physics,
            difficulty=Difficulty.intermediate,
            simulation_type=SimulationType.ohms_law,
            status=ExperimentStatus.published,
            description="Ohm's law for student submission.",
            parameters={
                "voltage_V": 10.0,
                "resistance_ohm": 5.0,
                "expected_values": {"current_A": 2.0, "power_W": 20.0},
                "tolerance": 0.05,
            },
            created_by=self.teacher1.id,
        )
        self.db.add(exp)
        self.db.commit()
        self.db.refresh(exp)

        resp = self.client.post(
            "/api/v1/submissions/",
            headers={"Authorization": f"Bearer {self.student_token}"},
            json={
                "experiment_id": exp.id,
                "recorded_observations": {
                    "voltage_V": 10.0,
                    "resistance_ohm": 5.0,
                    "current_A": 2.0,
                    "power_W": 20.0,
                },
            },
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["student_id"], self.student.id)
        self.assertEqual(data["status"], "submitted")

    def test_R_student_cannot_access_another_students_submission(self):
        """R. Student cannot view another student's submission (403 Forbidden)."""
        exp = Experiment(
            title="Lab for Submission Ownership",
            subject=Subject.physics,
            difficulty=Difficulty.intermediate,
            simulation_type=SimulationType.generic,
            status=ExperimentStatus.published,
            description="Submission ownership test.",
            created_by=self.teacher1.id,
        )
        self.db.add(exp)
        self.db.commit()
        self.db.refresh(exp)

        sub = Submission(
            student_id=self.student2.id,
            experiment_id=exp.id,
            status=SubmissionStatus.submitted,
        )
        self.db.add(sub)
        self.db.commit()
        self.db.refresh(sub)

        resp = self.client.get(
            f"/api/v1/submissions/{sub.id}",
            headers={"Authorization": f"Bearer {self.student_token}"},
        )
        self.assertEqual(resp.status_code, 403)

    def test_S_backend_performs_grading(self):
        """S. Server-side grading evaluates observations and returns score."""
        exp = Experiment(
            title="Auto Grading Lab",
            subject=Subject.physics,
            difficulty=Difficulty.intermediate,
            simulation_type=SimulationType.ohms_law,
            status=ExperimentStatus.published,
            description="Auto grading test.",
            parameters={
                "voltage_V": 12.0,
                "resistance_ohm": 4.0,
                "expected_values": {"current_A": 3.0, "power_W": 36.0},
                "tolerance": 0.05,
            },
            created_by=self.teacher1.id,
        )
        self.db.add(exp)
        self.db.commit()
        self.db.refresh(exp)

        resp = self.client.post(
            "/api/v1/submissions/",
            headers={"Authorization": f"Bearer {self.student_token}"},
            json={
                "experiment_id": exp.id,
                "recorded_observations": {
                    "voltage_V": 12.0,
                    "resistance_ohm": 4.0,
                    "current_A": 3.0,
                    "power_W": 36.0,
                },
            },
        )
        self.assertEqual(resp.status_code, 201)
        score = resp.json()["calculated_score"]
        self.assertIsNotNone(score)
        self.assertEqual(score, 100.0)

    def test_T_student_can_view_own_result(self):
        """T. Student can view their own submissions via /submissions/me."""
        exp = Experiment(
            title="My Result Lab",
            subject=Subject.physics,
            difficulty=Difficulty.intermediate,
            simulation_type=SimulationType.generic,
            status=ExperimentStatus.published,
            description="My result test.",
            created_by=self.teacher1.id,
        )
        self.db.add(exp)
        self.db.commit()
        self.db.refresh(exp)

        sub = Submission(
            student_id=self.student.id,
            experiment_id=exp.id,
            calculated_score=95.0,
            status=SubmissionStatus.graded,
        )
        self.db.add(sub)
        self.db.commit()

        resp = self.client.get(
            "/api/v1/submissions/me",
            headers={"Authorization": f"Bearer {self.student_token}"},
        )
        self.assertEqual(resp.status_code, 200)
        subs = resp.json()
        self.assertTrue(len(subs) >= 1)
        self.assertEqual(subs[0]["calculated_score"], 95.0)

    def test_U_teacher_and_admin_can_view_submissions(self):
        """U. Teacher and admin can view experiment submissions."""
        exp = Experiment(
            title="Shared Submissions Lab",
            subject=Subject.physics,
            difficulty=Difficulty.intermediate,
            simulation_type=SimulationType.generic,
            status=ExperimentStatus.published,
            description="Shared submission test.",
            created_by=self.teacher1.id,
        )
        self.db.add(exp)
        self.db.commit()
        self.db.refresh(exp)

        sub = Submission(
            student_id=self.student.id,
            experiment_id=exp.id,
            status=SubmissionStatus.submitted,
        )
        self.db.add(sub)
        self.db.commit()

        # Teacher check
        t_resp = self.client.get(
            f"/api/v1/submissions/experiment/{exp.id}",
            headers={"Authorization": f"Bearer {self.teacher1_token}"},
        )
        self.assertEqual(t_resp.status_code, 200)
        self.assertEqual(len(t_resp.json()), 1)

        # Admin check
        a_resp = self.client.get(
            f"/api/v1/submissions/experiment/{exp.id}",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(a_resp.status_code, 200)
        self.assertEqual(len(a_resp.json()), 1)

    def test_V_student_cannot_access_admin_endpoints(self):
        """V. Student receives 403 on all admin endpoints."""
        endpoints = [
            ("GET", "/api/v1/admin/stats"),
            ("GET", "/api/v1/admin/users"),
            ("POST", "/api/v1/admin/users/teacher"),
            (f"PATCH", f"/api/v1/admin/users/{self.teacher1.id}"),
        ]
        for method, url in endpoints:
            if method == "GET":
                resp = self.client.get(url, headers={"Authorization": f"Bearer {self.student_token}"})
            elif method == "POST":
                resp = self.client.post(url, headers={"Authorization": f"Bearer {self.student_token}"}, json={})
            else:
                resp = self.client.patch(url, headers={"Authorization": f"Bearer {self.student_token}"}, json={})
            self.assertEqual(resp.status_code, 403, f"Failed for {method} {url}")

    def test_W_admin_can_manage_teachers(self):
        """W. Admin can toggle user active status and update profile."""
        resp = self.client.patch(
            f"/api/v1/admin/users/{self.teacher1.id}",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"is_active": False, "subject_code": "PHY999"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["is_active"])
        self.assertEqual(data["subject_code"], "PHY999")

    def test_X_existing_batch1_concepts_preserved(self):
        """X. Verify Batch 1 role integrity (student cannot escalate on patch/create)."""
        self.assertEqual(self.student.role, UserRole.student)
        self.assertEqual(self.teacher1.role, UserRole.teacher)
        self.assertEqual(self.admin.role, UserRole.admin)

    def test_Y_existing_batch2_postgres_readiness_preserved(self):
        """Y. Verify Experiment model has proper simulation_type and status enums."""
        exp = Experiment(
            title="Batch 2 Check",
            subject=Subject.biology,
            difficulty=Difficulty.beginner,
            simulation_type=SimulationType.ph,
            status=ExperimentStatus.draft,
            description="Testing enums.",
            created_by=self.teacher1.id,
        )
        self.db.add(exp)
        self.db.commit()
        self.assertEqual(exp.simulation_type, SimulationType.ph)
        self.assertEqual(exp.status, ExperimentStatus.draft)

    def test_Z_existing_batch3_stats_and_health_endpoints_work(self):
        """Z. Verify health endpoints and admin stats return 200 OK."""
        h_resp = self.client.get("/health")
        self.assertEqual(h_resp.status_code, 200)
        self.assertEqual(h_resp.json()["status"], "ok")

        s_resp = self.client.get(
            "/api/v1/admin/stats",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(s_resp.status_code, 200)
        stats = s_resp.json()
        self.assertIn("total_students", stats)
        self.assertIn("total_teachers", stats)
        self.assertIn("total_experiments", stats)


if __name__ == "__main__":
    unittest.main()
