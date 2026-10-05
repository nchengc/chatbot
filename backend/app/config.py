"""Application configuration loaded from environment variables.

parse 0 only validates that config loads; MiniMax / DB fields are
placeholders that will be wired up in parse 2+.
"""
from __future__ import annotations

from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All runtime configuration.

    Reads from `.env` if present (parse 0 onward). Environment variables
    override file values so Docker / Vercel deploys can inject secrets
    directly.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    app_env: str = Field(default="dev", alias="APP_ENV")
    app_name: str = Field(default="chatbot-backend", alias="APP_NAME")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # --- Database (placeholder; parse 2 starts using) ---
    database_url: str = Field(
        default="sqlite:///./data/app.db",
        alias="DATABASE_URL",
    )

    # --- MiniMax (parse 2/3 starts using) ---
    minimax_base_url: str = Field(default="", alias="MINIMAX_BASE_URL")
    minimax_api_key: str = Field(default="", alias="MINIMAX_API_KEY")
    minimax_chat_model: str = Field(default="", alias="MINIMAX_CHAT_MODEL")
    minimax_reasoning_model: str = Field(
        default="",
        alias="MINIMAX_REASONING_MODEL",
    )

    # --- CORS ---
    # Stored as a raw CSV string and split on access — pydantic-settings
    # v2 doesn't reliably parse List[str] from .env files.
    cors_origins_raw: str = Field(
        default="http://localhost:5173",
        alias="CORS_ORIGINS",
    )

    @property
    def cors_origins(self) -> List[str]:
        return [
            o.strip()
            for o in self.cors_origins_raw.split(",")
            if o.strip()
        ]

    @property
    def is_dev(self) -> bool:
        return self.app_env.lower() in {"dev", "development", "local"}


# Singleton — import as `from app.config import settings`.
settings = Settings()