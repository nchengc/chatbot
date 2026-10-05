"""Smoke tests for parse 3 — reasoning mode (thinking SSE chunks, persisted
`Message.thinking`, mode PATCH on the session row).

Strategy mirrors `test_parse2.py`: SQLite per session, factory monkeypatch
to a deterministic mock LLM that emits both `thinking` and `delta` chunks
when `mode == "reasoning"`.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Iterator

import pytest
from fastapi.testclient import TestClient

# ----- env setup BEFORE app imports ------------------------------
_TEST_DIR = Path(__file__).resolve().parent / "data"
_TEST_DIR.mkdir(parents=True, exist_ok=True)
_TEST_DB = _TEST_DIR / "test_parse3.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB}"

from app.db import engine as db_engine  # noqa: E402
from app.db.models import ChatSession, Message, User  # noqa: E402
from app.routers import chat as chat_router  # noqa: E402
from app.services.llm import factory as factory_mod  # noqa: E402
from app.main import app  # noqa: E402
from tests.mock_minimax import MockMiniMaxClient  # noqa: E402

# Reasoning-mode mock: emits a short thinking chunk before the reply.
_mock_client = MockMiniMaxClient(
    reply="推理完成后的最终答案。",
    thinking="让我先想清楚再回答……",
    delay=0.005,
)
factory_mod.get_llm_client = lambda: _mock_client  # type: ignore[assignment]
chat_router.get_llm_client = lambda: _mock_client  # type: ignore[assignment]


# ----- fixtures ---------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def _init_db_once():
    db_engine.init_db()
    yield


@pytest.fixture(autouse=True)
def _truncate_tables():
    yield
    with db_engine.engine.begin() as conn:
        for table in (Message, ChatSession, User):
            conn.exec_driver_sql(f"DELETE FROM {table.__tablename__}")


@pytest.fixture(autouse=True)
def _restore_parse3_mock():
    """Re-apply the parse 3 mock client before each test.

    parse 2 tests overwrite `factory_mod.get_llm_client` at module load;
    when both files are collected in the same pytest run, the order is
    not guaranteed, so each test in this file re-asserts the
    reasoning-aware mock to keep the parse 3 contract.
    """
    factory_mod.get_llm_client = lambda: _mock_client  # type: ignore[assignment]
    chat_router.get_llm_client = lambda: _mock_client  # type: ignore[assignment]
    yield


@pytest.fixture
def client() -> Iterator[TestClient]:
    return TestClient(app)


def _uid() -> str:
    return "33333333-3333-3333-3333-333333333333"


# ----- helpers ----------------------------------------------------

def _read_sse(resp) -> list[tuple[str, str]]:
    """Return [(event_name, data_json), ...] parsed from an SSE response."""
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
    return raw_events


# ----- tests ------------------------------------------------------

def test_create_session_with_reasoning_mode(client):
    r = client.post(
        "/v1/sessions",
        headers={"X-User-Id": _uid()},
        json={"title": "推理会话", "mode": "reasoning"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["mode"] == "reasoning"


def test_patch_session_mode_flips(client):
    r = client.post(
        "/v1/sessions",
        headers={"X-User-Id": _uid()},
    )
    sid = r.json()["id"]
    assert r.json()["mode"] == "chat"

    r = client.patch(
        f"/v1/sessions/{sid}",
        headers={"X-User-Id": _uid(), "Content-Type": "application/json"},
        json={"mode": "reasoning"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["mode"] == "reasoning"

    # Confirm persistence by re-fetching.
    r = client.get("/v1/sessions", headers={"X-User-Id": _uid()})
    assert r.json()[0]["mode"] == "reasoning"


def test_reasoning_chat_streams_thinking_and_message(client):
    r = client.post(
        "/v1/sessions",
        headers={"X-User-Id": _uid()},
        json={"mode": "reasoning"},
    )
    sid = r.json()["id"]

    with client.stream(
        "POST",
        "/v1/chat/completions",
        headers={"X-User-Id": _uid(), "Content-Type": "application/json"},
        json={"session_id": sid, "content": "2+2 等于几？", "mode": "reasoning"},
    ) as resp:
        assert resp.status_code == 200
        events = _read_sse(resp)

    names = [ev for ev, _ in events]
    assert "meta" in names
    assert "thinking" in names
    assert "message" in names
    assert "done" in names

    # Verify thinking chunks carry deltas.
    thinking_text = ""
    for ev, payload in events:
        if ev == "thinking" and payload:
            thinking_text += json.loads(payload).get("delta", "")
    assert "想清楚" in thinking_text or "思考" in thinking_text or thinking_text != ""

    # And the message chunks carry the final reply.
    reply_text = ""
    for ev, payload in events:
        if ev == "message" and payload:
            reply_text += json.loads(payload).get("delta", "")
    assert "推理完成" in reply_text

    # DB persistence: assistant message has thinking populated.
    r = client.get(
        f"/v1/sessions/{sid}/messages",
        headers={"X-User-Id": _uid()},
    )
    msgs = r.json()["messages"]
    assistant = next(m for m in msgs if m["role"] == "assistant")
    assert assistant["content"] != ""
    assert assistant["thinking"] is not None and assistant["thinking"] != ""


def test_chat_mode_does_not_emit_thinking_events(client):
    r = client.post(
        "/v1/sessions",
        headers={"X-User-Id": _uid()},
    )
    sid = r.json()["id"]

    with client.stream(
        "POST",
        "/v1/chat/completions",
        headers={"X-User-Id": _uid(), "Content-Type": "application/json"},
        json={"session_id": sid, "content": "你好", "mode": "chat"},
    ) as resp:
        assert resp.status_code == 200
        events = _read_sse(resp)

    names = [ev for ev, _ in events]
    # Mock client only emits `thinking` when mode == reasoning, so chat
    # mode should not produce a `thinking` SSE frame.
    assert "thinking" not in names
    assert "message" in names
    assert "done" in names
