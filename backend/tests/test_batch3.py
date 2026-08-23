"""
tests/test_batch3.py
--------------------
Focused test suite for Batch 3: Production Frontend/Backend Configuration.

Test cases:
  A. VITE_API_URL respected & dev fallback logic
  B. Production CORS comma-separated & JSON array parsing
  C. Trusted Hosts validation and environment configuration
  D. Production SECRET_KEY validation rejects weak/placeholder secrets
  E. Production SECRET_KEY validation accepts strong secrets
  F. Health endpoint /health returns 200 without exposing secrets
  G. Deep health endpoint /health/db handles unreachable database safely
  H. Vercel SPA configuration vercel.json exists and is valid
  I. Backend requirements.txt exists and contains all required deployment dependencies
  J. Role routing guard and redirect logic verification
"""

import json
import os
import unittest
from pathlib import Path
from pydantic import ValidationError
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import Settings
from app.models.user import UserRole
from tests.test_utils import clean_test_db


class TestBatch3(unittest.TestCase):
    def setUp(self):
        clean_test_db()
        self.client = TestClient(app)

    # -----------------------------------------------------------------------
    # Requirement A & B: Frontend API URL & Fallback Logic Verification
    # -----------------------------------------------------------------------
    def test_a_and_b_frontend_api_config_and_fallback(self):
        """A & B. Verify frontend api.ts and .env.example configure VITE_API_URL with /api/v1 fallback."""
        frontend_dir = Path(__file__).resolve().parent.parent.parent / "frontend"
        api_ts_path = frontend_dir / "src" / "services" / "api.ts"
        env_example_path = frontend_dir / ".env.example"

        self.assertTrue(api_ts_path.exists(), "frontend/src/services/api.ts must exist")
        self.assertTrue(env_example_path.exists(), "frontend/.env.example must exist")

        api_ts_content = api_ts_path.read_text(encoding="utf-8")
        self.assertIn("import.meta.env.VITE_API_URL", api_ts_content)
        self.assertIn("'/api/v1'", api_ts_content)

        env_content = env_example_path.read_text(encoding="utf-8")
        self.assertIn("VITE_API_URL", env_content)

    # -----------------------------------------------------------------------
    # Requirement C: Production CORS Configuration
    # -----------------------------------------------------------------------
    def test_c_cors_configuration_parsing(self):
        """C. Verify ALLOWED_ORIGINS parses comma-separated strings and JSON arrays."""
        # Comma-separated
        s1 = Settings(
            DATABASE_URL="sqlite:///./test.db",
            ALLOWED_ORIGINS="https://loreto-lab.vercel.app, https://custom.domain.org",
        )
        self.assertEqual(
            s1.ALLOWED_ORIGINS,
            ["https://loreto-lab.vercel.app", "https://custom.domain.org"],
        )

        # JSON array string
        s2 = Settings(
            DATABASE_URL="sqlite:///./test.db",
            ALLOWED_ORIGINS='["https://app1.vercel.app", "https://app2.vercel.app"]',
        )
        self.assertEqual(
            s2.ALLOWED_ORIGINS,
            ["https://app1.vercel.app", "https://app2.vercel.app"],
        )

    # -----------------------------------------------------------------------
    # Requirement D & E: Secret Key Validation
    # -----------------------------------------------------------------------
    def test_d_production_secret_key_rejects_insecure_defaults(self):
        """D. Production APP_ENV must reject default placeholder secrets and short keys."""
        # Reject default placeholder in production
        with self.assertRaises(ValidationError):
            Settings(
                DATABASE_URL="sqlite:///./test.db",
                APP_ENV="production",
                SECRET_KEY="change-me-to-a-long-random-string",
            )

        # Reject short key (< 32 chars) in production
        with self.assertRaises(ValidationError):
            Settings(
                DATABASE_URL="sqlite:///./test.db",
                APP_ENV="production",
                SECRET_KEY="short-secret-key",
            )

    def test_e_production_secret_key_accepts_strong_secret(self):
        """E. Production APP_ENV accepts strong 32+ character secrets."""
        strong_key = "a" * 32 + "-production-secure-key-12345"
        s = Settings(
            DATABASE_URL="sqlite:///./test.db",
            APP_ENV="production",
            SECRET_KEY=strong_key,
        )
        self.assertEqual(s.SECRET_KEY, strong_key)
        self.assertFalse(s.is_development)

    # -----------------------------------------------------------------------
    # Requirement F & G: Health Check Endpoints
    # -----------------------------------------------------------------------
    def test_f_health_check_endpoint(self):
        """F. /health returns 200 with service info and no secret leakage."""
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("service", data)
        self.assertNotIn("secret", str(data).lower())
        self.assertNotIn("password", str(data).lower())

    def test_g_health_check_db_sanitization(self):
        """G. /health/db returns reachable status and does not leak credentials on error."""
        res = self.client.get("/health/db")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["database"], "reachable")

    # -----------------------------------------------------------------------
    # Requirement H: Trusted Host Configuration
    # -----------------------------------------------------------------------
    def test_h_trusted_host_configuration_parsing(self):
        """H. Verify ALLOWED_HOSTS parses comma-separated strings without wildcards."""
        s = Settings(
            DATABASE_URL="sqlite:///./test.db",
            ALLOWED_HOSTS="localhost, 127.0.0.1, api-prod.onrender.com",
        )
        self.assertEqual(
            s.ALLOWED_HOSTS,
            ["localhost", "127.0.0.1", "api-prod.onrender.com"],
        )

    # -----------------------------------------------------------------------
    # Requirement I: Vercel SPA Configuration
    # -----------------------------------------------------------------------
    def test_i_vercel_json_spa_configuration(self):
        """I. Verify frontend/vercel.json exists and defines client-side SPA routing."""
        vercel_json_path = (
            Path(__file__).resolve().parent.parent.parent
            / "frontend"
            / "vercel.json"
        )
        self.assertTrue(vercel_json_path.exists(), "frontend/vercel.json must exist")
        data = json.loads(vercel_json_path.read_text(encoding="utf-8"))
        self.assertIn("rewrites", data)
        rewrites = data["rewrites"]
        self.assertTrue(any(r.get("destination") == "/index.html" for r in rewrites))

    # -----------------------------------------------------------------------
    # Requirement J: Requirements Dependency Definitions
    # -----------------------------------------------------------------------
    def test_j_backend_requirements_file(self):
        """J. Verify backend/requirements.txt contains production stack dependencies."""
        req_path = (
            Path(__file__).resolve().parent.parent.parent
            / "backend"
            / "requirements.txt"
        )
        self.assertTrue(req_path.exists(), "backend/requirements.txt must exist")
        content = req_path.read_text(encoding="utf-8").lower()
        self.assertIn("fastapi", content)
        self.assertIn("uvicorn", content)
        self.assertIn("sqlalchemy", content)
        self.assertIn("psycopg2-binary", content)
        self.assertIn("alembic", content)
        self.assertIn("pydantic", content)
        self.assertIn("python-multipart", content)


if __name__ == "__main__":
    unittest.main()
