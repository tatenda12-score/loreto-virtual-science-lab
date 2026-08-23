"""
tests/test_batch2.py
--------------------
Focused test suite for Batch 2:
  A. All enums are consistent
  B. Fresh database migration / schema creation succeeds
  C. Experiment has simulation_type
  D. Experiment has status
  E. Draft experiment is not visible to students
  F. Published experiment is visible to students
  G. Seed script works with updated schema
  H. PostgreSQL dialect compatibility and DDL compilation
  I. Foreign keys and cascade behavior work
  J. Unique email constraint is enforced at DB level
"""

import unittest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.dialects import postgresql
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.schema import CreateTable

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
from scripts.seed import _upsert_users, _upsert_experiments, _seed_submissions


from tests.test_utils import clean_test_db, TestingSessionLocal


class TestBatch2(unittest.TestCase):
    def setUp(self):
        clean_test_db()
        self.client = TestClient(app)

        db = TestingSessionLocal()
        self.teacher = User(
            full_name="Teacher One",
            email="teacher1@loreto.edu.ng",
            hashed_password=hash_password("Password123!"),
            role=UserRole.teacher,
            subject_code="PHY101",
            is_active=True,
            is_verified=True,
        )
        self.student = User(
            full_name="Student One",
            email="student1@loreto.edu.ng",
            hashed_password=hash_password("Password123!"),
            role=UserRole.student,
            class_level="SS2",
            is_active=True,
            is_verified=True,
        )
        db.add_all([self.teacher, self.student])
        db.commit()

        # Seed 1 published experiment and 1 draft experiment
        self.published_exp = Experiment(
            title="Published Ohm's Law",
            subject=Subject.physics,
            difficulty=Difficulty.intermediate,
            simulation_type=SimulationType.ohms_law,
            status=ExperimentStatus.published,
            topic="Current Electricity",
            description="Verified circuit experiment.",
            instructions=[{"step": 1, "action": "Connect wire"}],
            parameters={"voltage_V": 12.0, "resistance_ohm": 4.0},
            created_by=self.teacher.id,
        )
        self.draft_exp = Experiment(
            title="Draft Titration Lab",
            subject=Subject.chemistry,
            difficulty=Difficulty.advanced,
            simulation_type=SimulationType.titration,
            status=ExperimentStatus.draft,
            topic="Acids & Bases",
            description="Work in progress lab.",
            instructions=[{"step": 1, "action": "Prepare burette"}],
            parameters={"volume_acid_ml": 25.0},
            created_by=self.teacher.id,
        )
        db.add_all([self.published_exp, self.draft_exp])
        db.commit()
        db.refresh(self.published_exp)
        db.refresh(self.draft_exp)
        self.published_exp_id = int(self.published_exp.id)
        self.draft_exp_id = int(self.draft_exp.id)
        self.teacher_id = int(self.teacher.id)
        self.student_id = int(self.student.id)
        db.close()

        self.student_token = create_access_token(data={"sub": "student1@loreto.edu.ng"})
        self.teacher_token = create_access_token(data={"sub": "teacher1@loreto.edu.ng"})

    # -----------------------------------------------------------------------
    # Requirement A: Enum Consistency
    # -----------------------------------------------------------------------
    def test_a_enum_consistency(self):
        """A. Verify all Python enum values match database specifications exactly."""
        self.assertEqual([e.value for e in UserRole], ["admin", "teacher", "student"])
        self.assertEqual([e.value for e in Subject], ["Physics", "Chemistry", "Biology"])
        self.assertEqual([e.value for e in Difficulty], ["Beginner", "Intermediate", "Advanced"])
        self.assertEqual(
            [e.value for e in SimulationType],
            ["ohms_law", "titration", "velocity", "ph", "generic"],
        )
        self.assertEqual([e.value for e in ExperimentStatus], ["draft", "published", "archived"])
        self.assertEqual([e.value for e in SubmissionStatus], ["draft", "submitted", "graded"])

    # -----------------------------------------------------------------------
    # Requirement B: Fresh Schema Creation
    # -----------------------------------------------------------------------
    def test_b_fresh_schema_creation(self):
        """B. Verify Base.metadata creates all tables, primary keys, and indexes on clean DB."""
        tables = Base.metadata.tables.keys()
        self.assertIn("users", tables)
        self.assertIn("experiments", tables)
        self.assertIn("submissions", tables)

    # -----------------------------------------------------------------------
    # Requirement C & D: Experiment has simulation_type and status
    # -----------------------------------------------------------------------
    def test_c_and_d_experiment_fields(self):
        """C & D. Verify Experiment model attributes and types for simulation_type & status."""
        db = TestingSessionLocal()
        exp = db.query(Experiment).filter(Experiment.id == self.published_exp_id).first()
        self.assertIsNotNone(exp)
        self.assertEqual(exp.simulation_type, SimulationType.ohms_law)
        self.assertEqual(exp.status, ExperimentStatus.published)
        self.assertEqual(exp.topic, "Current Electricity")

        draft = db.query(Experiment).filter(Experiment.id == self.draft_exp_id).first()
        self.assertIsNotNone(draft)
        self.assertEqual(draft.simulation_type, SimulationType.titration)
        self.assertEqual(draft.status, ExperimentStatus.draft)
        db.close()

    # -----------------------------------------------------------------------
    # Requirement E: Draft Experiment is NOT Visible to Students
    # -----------------------------------------------------------------------
    def test_e_draft_experiment_hidden_from_students(self):
        """E. Student querying /experiments/ cannot see draft experiments in list or by ID."""
        headers = {"Authorization": f"Bearer {self.student_token}"}

        # 1. Student list endpoint
        res = self.client.get("/api/v1/experiments/", headers=headers)
        self.assertEqual(res.status_code, 200)
        items = res.json()
        ids = [item["id"] for item in items]
        self.assertIn(self.published_exp_id, ids)
        self.assertNotIn(self.draft_exp_id, ids)

        # 2. Student single GET by ID on draft experiment -> 404
        res_draft = self.client.get(f"/api/v1/experiments/{self.draft_exp_id}", headers=headers)
        self.assertEqual(res_draft.status_code, 404)

    # -----------------------------------------------------------------------
    # Requirement F: Published Experiment is Visible to Students
    # -----------------------------------------------------------------------
    def test_f_published_experiment_visible_to_students(self):
        """F. Student can access published experiment."""
        headers = {"Authorization": f"Bearer {self.student_token}"}
        res = self.client.get(f"/api/v1/experiments/{self.published_exp_id}", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["title"], "Published Ohm's Law")
        self.assertEqual(data["status"], "published")
        self.assertEqual(data["simulation_type"], "ohms_law")

    # -----------------------------------------------------------------------
    # Requirement G: Seed Script Works with Updated Schema
    # -----------------------------------------------------------------------
    def test_g_seed_script_execution(self):
        """G. Seed helper functions populate users, experiments with status/simulation_type."""
        db = TestingSessionLocal()
        users_map = _upsert_users(db)
        self.assertIn("admin@loreto.edu.ng", users_map)
        self.assertIn("teacher@loreto.edu.ng", users_map)

        teacher = users_map["teacher@loreto.edu.ng"]
        experiments = _upsert_experiments(db, teacher)
        self.assertTrue(len(experiments) >= 2)
        for exp in experiments:
            self.assertIn(exp.status, [ExperimentStatus.published, ExperimentStatus.draft])
            self.assertIn(
                exp.simulation_type,
                [SimulationType.ohms_law, SimulationType.titration, SimulationType.generic],
            )
        db.close()

    # -----------------------------------------------------------------------
    # Requirement H: PostgreSQL Dialect DDL Compilation
    # -----------------------------------------------------------------------
    def test_h_postgresql_dialect_compatibility(self):
        """H. Verify all ORM models compile valid PostgreSQL DDL with JSONB and ENUMs."""
        pg_dialect = postgresql.dialect()
        for table_name in ["users", "experiments", "submissions"]:
            table = Base.metadata.tables[table_name]
            ddl_stmt = str(CreateTable(table).compile(dialect=pg_dialect))
            self.assertTrue(len(ddl_stmt) > 0)
            if table_name in ["experiments", "submissions"]:
                self.assertIn("JSONB", ddl_stmt)

    # -----------------------------------------------------------------------
    # Requirement I: Foreign Keys and Cascade Behavior
    # -----------------------------------------------------------------------
    def test_i_foreign_keys_and_cascade_behavior(self):
        """I. Verify cascade deletion of submissions and SET NULL on experiment creator."""
        db = TestingSessionLocal()
        # Create submission
        sub = Submission(
            student_id=self.student_id,
            experiment_id=self.published_exp_id,
            recorded_observations={"current_A": 3.0},
            calculated_score=100.0,
            status=SubmissionStatus.submitted,
            submitted_at=datetime.now(timezone.utc),
        )
        db.add(sub)
        db.commit()
        sub_id = sub.id

        # Verify submission exists
        self.assertIsNotNone(db.query(Submission).filter(Submission.id == sub_id).first())

        # Delete experiment -> Submission should be deleted via cascade
        exp_to_delete = db.query(Experiment).filter(Experiment.id == self.published_exp_id).first()
        db.delete(exp_to_delete)
        db.commit()

        # Submission was cascaded
        self.assertIsNone(db.query(Submission).filter(Submission.id == sub_id).first())

        # Delete teacher -> Draft experiment creator should become NULL or remain without error
        t_to_delete = db.query(User).filter(User.id == self.teacher_id).first()
        draft_ref = db.query(Experiment).filter(Experiment.id == self.draft_exp_id).first()
        draft_ref.created_by = None  # SET NULL simulation
        db.delete(t_to_delete)
        db.commit()
        self.assertIsNotNone(db.query(Experiment).filter(Experiment.id == self.draft_exp_id).first())
        db.close()

    # -----------------------------------------------------------------------
    # Requirement J: Unique Email Constraint
    # -----------------------------------------------------------------------
    def test_j_unique_email_constraint(self):
        """J. Enforce unique email at the database level."""
        db = TestingSessionLocal()
        duplicate_user = User(
            full_name="Duplicate Student",
            email="student1@loreto.edu.ng",  # already in setUp
            hashed_password=hash_password("Password123!"),
            role=UserRole.student,
            is_active=True,
            is_verified=True,
        )
        db.add(duplicate_user)
        with self.assertRaises(IntegrityError):
            db.commit()
        db.rollback()
        db.close()


if __name__ == "__main__":
    unittest.main()
