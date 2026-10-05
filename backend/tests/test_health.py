"""Smoke tests for the parse 0 health endpoint."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["service"] == "chatbot-backend"
    assert payload["env"] == "dev"


def test_health_includes_iso_timestamp(client: TestClient) -> None:
    response = client.get("/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert "time" in body
    # ISO-8601 UTC ending in "+00:00" or "Z"
    assert body["time"].endswith("+00:00") or body["time"].endswith("Z")


def test_cors_allows_vite_origin(client: TestClient) -> None:
    """parse 0 verification: Vite dev server must be allowed through CORS."""
    response = client.get(
        "/v1/health",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 200
    allow_origin = response.headers.get("access-control-allow-origin")
    assert allow_origin == "http://localhost:5173"