"""Prompt assembly.

parse 2 is intentionally minimal: a short system prompt + the last N
turns of history (N = HISTORY_TURNS). parse 4+ will swap this for RAG
augmentation; the function signature stays stable.
"""
from __future__ import annotations

from typing import List, Mapping, Sequence

# Hard cap on history length to keep tokens under control even when the
# SQLite log gets long. parse 6 may make this user-configurable.
HISTORY_TURNS = 12  # ~6 user/assistant round-trips

SYSTEM_PROMPT = (
    "You are a helpful assistant. Use 中文 by default unless the user\n"
    "writes in another language. Keep responses structured with headings,\n"
    "lists, and code blocks when appropriate."
)


def build_messages(
    history: Sequence[Mapping[str, str]],
) -> List[dict]:
    """Convert persisted history into the OpenAI-style message list.

    `history` is expected to be a sequence of dicts with keys
    `role` and `content`, ordered oldest → newest. We trim to the last
    `HISTORY_TURNS * 2` entries (each "turn" = 2 messages).
    """
    trimmed = list(history)[-HISTORY_TURNS * 2:]
    return [{"role": "system", "content": SYSTEM_PROMPT}, *trimmed]


__all__ = ["build_messages", "SYSTEM_PROMPT", "HISTORY_TURNS"]