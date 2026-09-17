"""
tests/test_level_isolation.py
-----------------------------
Regression tests proving that the experiment level isolation system works
correctly for all four student levels: Form3, Form4, L6, and Upper6.

Requirements verified
---------------------
1.  Form3  student receives ONLY Form3  experiments (+ global null-level).
2.  Form4  student receives ONLY Form4  experiments (+ global null-level).
3.  L6     student receives ONLY L6     experiments (+ global null-level).
4.  Upper6 student receives ONLY Upper6 experiments (+ global null-level).
5.  L6     student cannot directly GET a Form4  experiment  (HTTP 404).
6.  Form4  student cannot directly GET an L6    experiment  (HTTP 404).
7.  L6     student cannot directly GET an Upper6 experiment (HTTP 404).
8.  Upper6 student cannot directly GET a Form3  experiment  (HTTP 404).
9.  Form3  student cannot directly GET a Form4  experiment  (HTTP 404).
10. Login-switching: JWT is stateless -- re-auth delivers correct level
    experiments with no stale state from a previous session.
11. class_level=None is intentionally global: visible to ALL levels.
12. L6 student CAN access their own experiments and receives sanitized params.

Architecture notes
------------------
* Server-side filtering is the security boundary. The backend enforces it in
  GET /api/v1/experiments/ and GET /api/v1/experiments/{id}.
* Students receive HTTP 404 (not 403) when accessing an out-of-level experiment
  -- matching the existing backend contract in get_experiment().
* class_level=None means global per Experiment model docstring and schema.
* Login-switching correctness is inherent to stateless JWT: each request
  re-fetches the user from DB via the token sub claim.
"""

import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User, UserRole
from app.models.experiment import (
    Difficulty,
    Experiment,
    ExperimentStatus,
    SimulationType,
    Subject,
)
from app.core.security import hash_password, create_access_token
from tests.test_utils import clean_test_db, TestingSessionLocal

_PASSWORD = "Password123!"


def _auth(email: str) -> dict:
    token = create_access_token(data={"sub": email})
    return {"Authorization": f"Bearer {token}"}


class TestLevelIsolation(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Seed one teacher, four students (one per level), experiments for all
        levels, and one global (class_level=None) experiment."""
        # Explicitly restore the shared test-DB override.  test_batch4 installs
        # its own in-memory-DB override and tearDownClass drops that in-memory DB;
        # without this line, API calls would hit the dead in-memory engine and
        # raise 'no such table: users'.
        from app.db.database import get_db as _get_db
        from tests.test_utils import override_get_db
        app.dependency_overrides[_get_db] = override_get_db

        clean_test_db()
        cls.client = TestClient(app)
        db = TestingSessionLocal()

        teacher = User(
            full_name="ISO Teacher",
            email="teacher@iso.test",
            hashed_password=hash_password(_PASSWORD),
            role=UserRole.teacher,
            subject_code="SCI001",
            is_active=True,
            is_verified=True,
        )
        db.add(teacher)
        db.flush()

        cls._emails = {
            "Form3":  "student_form3@iso.test",
            "Form4":  "student_form4@iso.test",
            "L6":     "student_l6@iso.test",
            "Upper6": "student_upper6@iso.test",
        }
        for level, email in cls._emails.items():
            db.add(User(
                full_name=f"Student {level}",
                email=email,
                hashed_password=hash_password(_PASSWORD),
                role=UserRole.student,
                class_level=level,
                is_active=True,
                is_verified=True,
            ))
        db.flush()

        def _exp(title, level, sim, subj=Subject.biology):
            return Experiment(
                title=title, subject=subj,
                difficulty=Difficulty.intermediate,
                simulation_type=sim,
                status=ExperimentStatus.published,
                description="ISO test experiment.",
                topic="Test Topic",
                instructions=[{"step": 1, "action": "Do the thing."}],
                parameters={"expected_values": {"result": 1.0}, "tolerance": 0.05},
                class_level=level,
                created_by=teacher.id,
            )

        f3a = _exp("Food Tests (ISO)",         "Form3", SimulationType.food_tests)
        f3b = _exp("Separation (ISO)",          "Form3", SimulationType.separation)
        f3c = _exp("Moments (ISO)",             "Form3", SimulationType.moments, Subject.physics)
        f4a = _exp("Ohm's Law (ISO)",           "Form4", SimulationType.ohms_law, Subject.physics)
        f4b = _exp("F4 Titration (ISO)",        "Form4", SimulationType.titration, Subject.chemistry)
        l6a = _exp("Enzyme Activity (ISO)",     "L6",    SimulationType.enzyme_activity)
        l6b = _exp("L6 Titration (ISO)",        "L6",    SimulationType.l6_titration, Subject.chemistry)
        l6c = _exp("Internal Resistance (ISO)", "L6",    SimulationType.internal_resistance, Subject.physics)
        u6a = _exp("Photosynthesis (ISO)",      "Upper6", SimulationType.u6_photosynthesis)
        u6b = _exp("Chemical Kinetics (ISO)",   "Upper6", SimulationType.u6_kinetics, Subject.chemistry)
        u6c = _exp("Young Modulus (ISO)",       "Upper6", SimulationType.u6_young_modulus, Subject.physics)

        glob = Experiment(
            title="Welcome Lab (Global)",
            subject=Subject.biology,
            difficulty=Difficulty.beginner,
            simulation_type=SimulationType.generic,
            status=ExperimentStatus.published,
            description="Global experiment with no level restriction.",
            topic="General Science",
            instructions=[{"step": 1, "action": "Read and observe."}],
            parameters={"expected_values": {"result": 0.0}, "tolerance": 0.1},
            class_level=None,
            created_by=teacher.id,
        )

        for e in [f3a,f3b,f3c,f4a,f4b,l6a,l6b,l6c,u6a,u6b,u6c,glob]:
            db.add(e)
        db.flush()

        cls._ids = {
            "f3a": int(f3a.id), "f4a": int(f4a.id),
            "l6a": int(l6a.id), "l6b": int(l6b.id), "l6c": int(l6c.id),
            "u6a": int(u6a.id), "glob": int(glob.id),
        }
        cls._level_ids = {
            "Form3":  {int(f3a.id), int(f3b.id), int(f3c.id)},
            "Form4":  {int(f4a.id), int(f4b.id)},
            "L6":     {int(l6a.id), int(l6b.id), int(l6c.id)},
            "Upper6": {int(u6a.id), int(u6b.id), int(u6c.id)},
        }
        cls._global_id = int(glob.id)
        db.commit()
        db.close()

    def _list_ids(self, level: str) -> set:
        res = self.client.get(
            "/api/v1/experiments/",
            headers=_auth(self._emails[level])
        )
        self.assertEqual(res.status_code, 200,
            f"List experiments failed for {level}: {res.text}")
        return {e["id"] for e in res.json()}

    # ------------------------------------------------------------------
    # Tests 1-4: List endpoint isolation
    # ------------------------------------------------------------------

    def test_01_form3_receives_only_form3_experiments(self):
        """Form3 student list contains only Form3 + global experiments."""
        ids = self._list_ids("Form3")
        other = self._level_ids["Form4"] | self._level_ids["L6"] | self._level_ids["Upper6"]

        for eid in self._level_ids["Form3"]:
            self.assertIn(eid, ids, f"Form3 exp {eid} missing for Form3 student")
        self.assertIn(self._global_id, ids, "Global exp missing for Form3 student")

        leaked = ids & other
        self.assertEqual(leaked, set(),
            f"Form3 student received other-level experiments: {leaked}")

    def test_02_form4_receives_only_form4_experiments(self):
        """Form4 student list contains only Form4 + global experiments."""
        ids = self._list_ids("Form4")
        other = self._level_ids["Form3"] | self._level_ids["L6"] | self._level_ids["Upper6"]

        for eid in self._level_ids["Form4"]:
            self.assertIn(eid, ids, f"Form4 exp {eid} missing for Form4 student")
        self.assertIn(self._global_id, ids, "Global exp missing for Form4 student")

        leaked = ids & other
        self.assertEqual(leaked, set(),
            f"Form4 student received other-level experiments: {leaked}")

    def test_03_l6_receives_only_l6_experiments(self):
        """L6 student list contains only L6 + global experiments."""
        ids = self._list_ids("L6")
        other = self._level_ids["Form3"] | self._level_ids["Form4"] | self._level_ids["Upper6"]

        for eid in self._level_ids["L6"]:
            self.assertIn(eid, ids, f"L6 exp {eid} missing for L6 student")
        self.assertIn(self._global_id, ids, "Global exp missing for L6 student")

        leaked = ids & other
        self.assertEqual(leaked, set(),
            f"L6 student received other-level experiments: {leaked}")

    def test_04_upper6_receives_only_upper6_experiments(self):
        """Upper6 student list contains only Upper6 + global experiments."""
        ids = self._list_ids("Upper6")
        other = self._level_ids["Form3"] | self._level_ids["Form4"] | self._level_ids["L6"]

        for eid in self._level_ids["Upper6"]:
            self.assertIn(eid, ids, f"Upper6 exp {eid} missing for Upper6 student")
        self.assertIn(self._global_id, ids, "Global exp missing for Upper6 student")

        leaked = ids & other
        self.assertEqual(leaked, set(),
            f"Upper6 student received other-level experiments: {leaked}")

    # ------------------------------------------------------------------
    # Tests 5-9: Direct-access cross-level returns 404
    # ------------------------------------------------------------------

    def _assert_denied(self, level: str, exp_id: int, label: str):
        res = self.client.get(
            f"/api/v1/experiments/{exp_id}",
            headers=_auth(self._emails[level])
        )
        self.assertEqual(res.status_code, 404,
            f"{level} student should not access {label} exp id={exp_id}. "
            f"Got {res.status_code}: {res.text}")

    def test_05_l6_cannot_access_form4_experiment(self):
        """L6 student: direct GET of Form4 experiment -> HTTP 404."""
        self._assert_denied("L6", self._ids["f4a"], "Form4")

    def test_06_form4_cannot_access_l6_experiment(self):
        """Form4 student: direct GET of L6 experiment -> HTTP 404."""
        self._assert_denied("Form4", self._ids["l6a"], "L6")

    def test_07_l6_cannot_access_upper6_experiment(self):
        """L6 student: direct GET of Upper6 experiment -> HTTP 404."""
        self._assert_denied("L6", self._ids["u6a"], "Upper6")

    def test_08_upper6_cannot_access_form3_experiment(self):
        """Upper6 student: direct GET of Form3 experiment -> HTTP 404."""
        self._assert_denied("Upper6", self._ids["f3a"], "Form3")

    def test_09_form3_cannot_access_form4_experiment(self):
        """Form3 student: direct GET of Form4 experiment -> HTTP 404."""
        self._assert_denied("Form3", self._ids["f4a"], "Form4")

    # ------------------------------------------------------------------
    # Test 10: Login switching -- stateless JWT, no stale level state
    # ------------------------------------------------------------------

    def test_10a_login_switching_form4_then_l6(self):
        """
        Form4 token -> L6 token: each sees only their own experiments.
        Stateless JWT guarantees no session contamination between users.
        """
        f4_ids = self._list_ids("Form4")
        l6_ids = self._list_ids("L6")

        for eid in self._level_ids["Form4"]:
            self.assertIn(eid, f4_ids, f"Form4 exp {eid} missing after Form4 auth")
        for eid in self._level_ids["L6"]:
            self.assertIn(eid, l6_ids, f"L6 exp {eid} missing after L6 auth")

        cross_f4 = f4_ids & self._level_ids["L6"]
        self.assertEqual(cross_f4, set(),
            f"Form4 response leaked L6 IDs: {cross_f4}")

        cross_l6 = l6_ids & self._level_ids["Form4"]
        self.assertEqual(cross_l6, set(),
            f"L6 response leaked Form4 IDs: {cross_l6}")

    def test_10b_login_switching_l6_then_form4(self):
        """
        L6 token -> Form4 token: reverse direction, same isolation guarantee.
        """
        l6_ids  = self._list_ids("L6")
        f4_ids  = self._list_ids("Form4")

        for eid in self._level_ids["L6"]:
            self.assertIn(eid, l6_ids)
        for eid in self._level_ids["Form4"]:
            self.assertIn(eid, f4_ids)

        self.assertEqual(l6_ids  & self._level_ids["Form4"], set())
        self.assertEqual(f4_ids  & self._level_ids["L6"],    set())

    # ------------------------------------------------------------------
    # Test 11: Global null-level experiment visible to all (design intent)
    # ------------------------------------------------------------------

    def test_11_global_experiment_visible_to_all_levels(self):
        """
        An experiment with class_level=None is a globally available experiment.
        This is intentional per the model docstring ('Null means available to all')
        and the backend filter clause (class_level == None).
        All four student levels must see this experiment.
        """
        for level in ("Form3", "Form4", "L6", "Upper6"):
            ids = self._list_ids(level)
            self.assertIn(self._global_id, ids,
                f"Global (class_level=None) experiment missing for {level} student. "
                f"This is a design regression.")

    # ------------------------------------------------------------------
    # Test 12: L6 student can access their own experiments directly
    #          and receives sanitized parameters (no expected_values/tolerance)
    # ------------------------------------------------------------------

    def test_12_l6_can_access_own_experiments_directly(self):
        """L6 student can GET each own experiment by ID and gets sanitized params."""
        for key in ("l6a", "l6b", "l6c"):
            exp_id = self._ids[key]
            res = self.client.get(
                f"/api/v1/experiments/{exp_id}",
                headers=_auth(self._emails["L6"])
            )
            self.assertEqual(res.status_code, 200,
                f"L6 student could not access own exp id={exp_id}: {res.text}")
            data = res.json()
            self.assertEqual(data["class_level"], "L6")
            self.assertEqual(data["id"], exp_id)
            params = data.get("parameters") or {}
            self.assertNotIn("expected_values", params,
                f"expected_values leaked to L6 student for exp id={exp_id}")
            self.assertNotIn("tolerance", params,
                f"tolerance leaked to L6 student for exp id={exp_id}")


if __name__ == "__main__":
    unittest.main()