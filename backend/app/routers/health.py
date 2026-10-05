"""Health check router.

parse 0: exposes `GET /v1/health` returning a static OK payload.
parse 1+: stays the same; future parses add more probes (DB, MiniMax
reachability) under the same prefix.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    """Shape of `/v1/health` response."""

    ok: bool
    service: str
    env: str
    version: str
    time: str


@router.get("/health", response_model=HealthResponse, summary="Liveness probe")
async def health() -> HealthResponse:
    """Return 200 with service metadata. Used by browser, curl, and
    load balancer health checks."""
    from app.config import settings  # local import to avoid cycles

    return HealthResponse(
        ok=True,
        service=settings.app_name,
        env=settings.app_env,
        version="0.1.0",
        time=datetime.now(timezone.utc).isoformat(),
    )