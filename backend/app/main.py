"""FastAPI application entry.

parse 0: only health. parse 2: adds /sessions CRUD + /v1/chat/completions.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.engine import init_db
from app.routers import chat, health, sessions

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern startup/shutdown hook (replaces deprecated on_event).

    * parse 2+: create SQLite tables.
    * parse 2+: init the LLM client (logs a warning if not configured).
    """
    logging.basicConfig(level=settings.log_level)
    init_db()

    # Touch the LLM client so misconfig is logged at startup, not at first
    # request. parse 3 may also assert the client is configured here.
    from app.services.llm import get_llm_client
    get_llm_client()

    logger.info(
        "%s started on %s:%s (env=%s, cors=%s)",
        settings.app_name,
        settings.app_host,
        settings.app_port,
        settings.app_env,
        settings.cors_origins,
    )
    yield
    # shutdown
    from app.services.llm.factory import get_llm_client as _get
    client = _get()
    if client is not None and hasattr(client, "aclose"):
        try:
            await client.aclose()
        except Exception:  # pragma: no cover
            pass


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        version="0.2.0",
        docs_url="/docs" if settings.is_dev else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    application.include_router(health.router, prefix="/v1", tags=["health"])
    application.include_router(sessions.router, prefix="/v1", tags=["sessions"])
    application.include_router(chat.router, prefix="/v1", tags=["chat"])

    return application


app = create_app()