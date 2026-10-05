"""SSE formatting helpers.

We emit `text/event-stream` responses manually (no sse-starlette dep) so
the chunk format stays obvious. Two helpers:

  - `format_event(name, data)` → bytes ready for the socket
  - `format_comment(text)`     → SSE comment line (for keep-alives)

Each call ends with `\\n\\n` as required by the spec.
"""
from __future__ import annotations

import json
from typing import Any, Mapping


def _json_default(obj: Any) -> Any:
    # datetime, UUID, etc. — fall back to string.
    return str(obj)


def format_event(name: str, data: Mapping[str, Any] | str) -> bytes:
    """Encode one SSE event.

    Always serialises `data` to JSON; pass a string only if it's already
    valid JSON text.
    """
    if isinstance(data, str):
        payload = data
    else:
        payload = json.dumps(data, ensure_ascii=False, default=_json_default)
    return f"event: {name}\ndata: {payload}\n\n".encode("utf-8")


def format_comment(text: str = "") -> bytes:
    """SSE comment line, useful as a periodic keep-alive ping."""
    return f": {text}\n\n".encode("utf-8")


def format_done(extra: Mapping[str, Any] | None = None) -> bytes:
    """Convenience wrapper for the canonical terminal `done` event."""
    payload: dict[str, Any] = {"finish_reason": "stop"}
    if extra:
        payload.update(extra)
    return format_event("done", payload)