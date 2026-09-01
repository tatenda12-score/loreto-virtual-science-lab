"""
app/core/config.py
------------------
Central application configuration loaded from environment variables
via pydantic-settings. A single `settings` singleton is exported and
used throughout the application.
"""

from typing import Any, Union
import json
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator, model_validator


class Settings(BaseSettings):
    """
    All configurable values are read from the `.env` file located at the
    project root (backend/.env) or system environment variables.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",         # silently ignore unknown env vars
    )

    # ── Database ──────────────────────────────────────────────────────
    DATABASE_URL: str = Field(
        ...,
        description="Full database DSN, e.g. postgresql://user:pass@host/dbname or sqlite:///./loreto_lab.db",
    )

    # ── JWT / Security ────────────────────────────────────────────────
    SECRET_KEY: str = Field(
        default="change-me-to-a-long-random-string",
        description="Secret used to sign JWT tokens. Must be changed in production!",
    )
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)

    # ── Application metadata ──────────────────────────────────────────
    APP_ENV: str = Field(default="development")
    APP_TITLE: str = Field(default="Virtual Science Laboratory System")
    APP_VERSION: str = Field(default="1.0.0")

    # ── Cookie Security ───────────────────────────────────────────────
    COOKIE_DOMAIN: Union[str, None] = Field(
        default=None,
        description="Domain for HttpOnly cookies. Leave None for same-site in dev.",
    )
    COOKIE_SECURE: bool = Field(
        default=False,
        description="Set to True in production to ensure cookies only send over HTTPS",
    )
    COOKIE_SAMESITE: str = Field(
        default="lax",
        description="SameSite policy: lax | strict | none",
    )
    
    # ── API Docs ──────────────────────────────────────────────────────
    DISABLE_DOCS: bool = Field(
        default=False,
        description="Set to True in production to disable /docs and /openapi.json",
    )

    # ── CORS ──────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: Union[list[str], str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ],
        description="List of origins allowed by CORS middleware.",
    )

    # ── Trusted Hosts ─────────────────────────────────────────────────
    ALLOWED_HOSTS: Union[list[str], str] = Field(
        default=["localhost", "127.0.0.1"],
        description="List of allowed hosts for TrustedHostMiddleware in non-development mode.",
    )

    @field_validator("ALLOWED_ORIGINS", "ALLOWED_HOSTS", mode="before")
    @classmethod
    def parse_comma_separated_or_json_list(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            v_clean = v.strip()
            if v_clean.startswith("[") and v_clean.endswith("]"):
                try:
                    return json.loads(v_clean)
                except Exception:
                    pass
            return [item.strip() for item in v_clean.split(",") if item.strip()]
        if isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        return []

    @field_validator("ALLOWED_HOSTS", mode="after")
    @classmethod
    def ensure_render_hosts_included(cls, v: list[str]) -> list[str]:
        # Always allow onrender.com hostnames in production so Render healthchecks/proxies pass
        hosts = list(v)
        if not any("onrender.com" in h for h in hosts):
            hosts.extend(["loreto-virtual-science-lab.onrender.com", "*.onrender.com"])
        return hosts

    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        if not self.is_development:
            insecure_placeholders = {
                "change-me",
                "change-me-to-a-long-random-string",
                "secret",
                "secretkey",
                "password",
                "default",
            }
            sec = self.SECRET_KEY.strip()
            if not sec or sec.lower() in insecure_placeholders or len(sec) < 32:
                raise ValueError(
                    "A secure SECRET_KEY with at least 32 characters is required when APP_ENV is not 'development'."
                )
            
            if self.DATABASE_URL.startswith("sqlite"):
                raise ValueError("SQLite cannot be used as the production database.")
        return self

    @property
    def is_development(self) -> bool:
        return self.APP_ENV.lower() == "development"


# ---------------------------------------------------------------------------
# Module-level singleton — import this everywhere:
#   from app.core.config import settings
# ---------------------------------------------------------------------------
settings = Settings()
