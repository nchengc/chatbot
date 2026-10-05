"""Smoke tests for parse 2 — sessions + chat SSE with a mock LLM.

Strategy:
  * Single SQLite file per test session.
  * Truncate tables between tests (Windows-friendly: SQL files can't be
    deleted while held open by SQLAlchemy).
  * LLM factory patched at module level so chat SSE has a deterministic
    canned response.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Iterator

import pytest
from fastapi.testclient import TestClient

# ----- env setup BEFORE app imports ------------------------------
_TEST_DIR = Path(__file__).resolve().parent / "data"
_TEST_DIR.mkdir(parents=True, exist_ok=True)
_TEST_DB = _TEST_DIR / "test_parse2.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB}"

from app.db import engine as db_engine  # noqa: E402
from app.db.models import ChatSession, Message, User  # noqa: E402
from app.routers import chat as chat_router  # noqa: E402  (so we can patch its imported reference)
from app.services.llm import factory as factory_mod  # noqa: E402
from app.main import app  # noqa: E402
from tests.mock_minimax import MockMiniMaxClient  # noqa: E402

# Patch the LLM factory on BOTH the factory module AND the router's already-
# imported reference (routers do `from .. import get_llm_client` which freezes
# the symbol at import time).
_mock_client = MockMiniMaxClient(reply="你好！这是 mock MiniMax 回答。", delay=0.005)
factory_mod.get_llm_client = lambda: _mock_client  # type: ignore[assignment]
chat_router.get_llm_client = lambda: _mock_client  # type: ignore[assignment]


# ----- fixtures ---------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def _init_db_once():
    db_engine.init_db()
    yield


@pytest.fixture(autouse=True)
def _truncate_tables():
    """Wipe data between tests; SQLite file stays open."""
    yield
    with db_engine.engine.begin() as conn:
        for table in (Message, ChatSession, User):
            conn.exec_driver_sql(f"DELETE FROM {table.__tablename__}")


@pytest.fixture(autouse=True)
def _restore_parse2_mock():
    """Re-apply the parse 2 mock client before each test.

    parse 3 tests overwrite `factory_mod.get_llm_client` at module load;
    when both files are collected in the same pytest run, the order is
    not guaranteed, so each test in this file re-asserts the chat-only
    mock to keep the parse 2 contract.
    """
    factory_mod.get_llm_client = lambda: _mock_client  # type: ignore[assignment]
    chat_router.get_llm_client = lambda: _mock_client  # type: ignore[assignment]
    yield


@pytest.fixture
def client() -> Iterator[TestClient]:
    return TestClient(app)


def _uid() -> str:
    return "11111111-1111-1111-1111-111111111111"


# ----- tests ------------------------------------------------------

def test_create_session(client):
    r = client.post(
        "/v1/sessions",
        headers={"X-User-Id": _uid()},
        json={"title": "测试"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["title"] == "测试"
    assert body["mode"] == "chat"


def test_list_sessions_empty(client):
    r = client.get("/v1/sessions", headers={"X-User-Id": _uid()})
    assert r.status_code == 200
    assert r.json() == []


def test_session_lifecycle_and_messages(client):
    r = client.post(
        "/v1/sessions",
        headers={"X-User-Id": _uid()},
        json={"title": "测试"},
    )
    sid = r.json()["id"]

    r = client.get("/v1/sessions", headers={"X-User-Id": _uid()})
    assert r.status_code == 200
    sessions = r.json()
    assert len(sessions) == 1
    assert sessions[0]["id"] == sid

    r = client.get(
        f"/v1/sessions/{sid}/messages",
        headers={"X-User-Id": _uid()},
    )
    assert r.status_code == 200
    assert r.json()["messages"] == []


def test_chat_sse_streams_meta_message_done(client):
    r = client.post(
        "/v1/sessions",
        headers={"X-User-Id": _uid()},
        json={"title": "流式测试"},
    )
    sid = r.json()["id"]

    with client.stream(
        "POST",
        "/v1/chat/completions",
        headers={"X-User-Id": _uid(), "Content-Type": "application/json"},
        json={"session_id": sid, "content": "你好", "mode": "chat"},
    ) as resp:
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/event-stream")
        raw_events: list[tuple[str, str]] = []
        for line in resp.iter_lines():
            if not line:
                continue
            if line.startswith("event:"):
                ev = line[len("event:"):].strip()
                raw_events.append((ev, ""))
            elif line.startswith("data:"):
                payload = line[len("data:"):].strip()
                if raw_events and raw_events[-1][1] == "":
                    raw_events[-1] = (raw_events[-1][0], payload)
                else:
                    raw_events.append(("", payload))

    import json as _json
    names = [ev for ev, _ in raw_events]
    assert "meta" in names
    assert "message" in names
    assert "done" in names

    text = ""
    for ev, payload in raw_events:
        if ev == "message" and payload:
            try:
                text += _json.loads(payload).get("delta", "")
            except _json.JSONDecodeError:
                pass
    assert "你好" in text or "mock" in text

    r = client.get(
        f"/v1/sessions/{sid}/messages",
        headers={"X-User-Id": _uid()},
    )
    msgs = r.json()["messages"]
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[1]["role"] == "assistant"
    assert msgs[1]["content"] != ""


def test_chat_unknown_session_returns_404(client):
    r = client.post(
        "/v1/chat/completions",
        headers={"X-User-Id": _uid(), "Content-Type": "application/json"},
        json={"session_id": "does-not-exist", "content": "hi", "mode": "chat"},
    )
    assert r.status_code == 404


def test_delete_session_cascades(client):
    r = client.post(
        "/v1/sessions",
        headers={"X-User-Id": _uid()},
    )
    sid = r.json()["id"]
    r = client.delete(
        f"/v1/sessions/{sid}",
        headers={"X-User-Id": _uid()},
    )
    assert r.status_code == 204
    r = client.get("/v1/sessions", headers={"X-User-Id": _uid()})
    assert r.json() == []


def test_user_isolation(client):
    r = client.post(
        "/v1/sessions",
        headers={"X-User-Id": _uid()},
    )
    sid_a = r.json()["id"]

    r = client.get(
        f"/v1/sessions/{sid_a}/messages",
        headers={"X-User-Id": "22222222-2222-2222-2222-222222222222"},
    )
    assert r.status_code == 404

    r = client.delete(
        f"/v1/sessions/{sid_a}",
        headers={"X-User-Id": "22222222-2222-2222-2222-222222222222"},
    )
    assert r.status_code == 404


def test_patch_session_rename(client):
    r = client.post(
        "/v1/sessions",
        headers={"X-User-Id": _uid()},
    )
    sid = r.json()["id"]
    r = client.patch(
        f"/v1/sessions/{sid}",
        headers={"X-User-Id": _uid(), "Content-Type": "application/json"},
        json={"title": "新名字"},
    )
    assert r.status_code == 200
    assert r.json()["title"] == "新名字"


def test_chat_without_llm_returns_503(monkeypatch):
    """If `get_llm_client()` returns None, the chat endpoint surfaces 503."""
    none_fn = lambda: None
    monkeypatch.setattr(factory_mod, "get_llm_client", none_fn)
    monkeypatch.setattr(chat_router, "get_llm_client", none_fn)
    c = TestClient(app)
    r = c.post(
        "/v1/sessions",
        headers={"X-User-Id": _uid()},
    )
    sid = r.json()["id"]
    r = c.post(
        "/v1/chat/completions",
        headers={"X-User-Id": _uid(), "Content-Type": "application/json"},
        json={"session_id": sid, "content": "hi", "mode": "chat"},
    )
    assert r.status_code == 503
    assert "LLM not available" in r.json()["detail"]