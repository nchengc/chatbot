"""UUID helpers.

We trust browser-generated UUIDs for anonymous auth (v1). These helpers
parse + validate an incoming `X-User-Id` header.
"""
from __future__ import annotations

import re

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def is_uuid(s: str | None) -> bool:
    """True iff `s` looks like a v1–v5 UUID string."""
    return bool(s) and bool(_UUID_RE.match(s))