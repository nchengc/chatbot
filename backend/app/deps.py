"""FastAPI dependencies.

`get_current_user_id` reads `X-User-Id` (UUID from the browser's localStorage),
validates format, and falls back to a per-request ephemeral UUID when
missing/invalid. parse 8 will replace it with JWT auth.
"""
from __future__ import annotations

import uuid as _uuid

from fastapi import Header

from app.utils.uuid import is_uuid


def get_current_user_id(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> str:
    """Resolve the anonymous user id from the request header.

    Returns the header value if it parses as a UUID; otherwise generates
    a fresh one (so a misconfigured browser doesn't 401 — the data just
    won't be retrievable across requests).
    """
    if x_user_id and is_uuid(x_user_id):
        return x_user_id
    return str(_uuid.uuid4())