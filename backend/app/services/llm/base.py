"""LLM client protocol.

parse 2 unifies all LLM providers behind one async streaming interface
so the router doesn't need to know whether it's talking to MiniMax, an
OpenAI-compatible service, or (parse 3) a reasoning-tuned model.

The contract is intentionally narrow::

    async for chunk in client.stream(messages, **opts):
            ...

Each chunk is a `LLMChunk` carrying either content delta, a tool call,
a tool result, or a finish marker. parse 2 only uses `delta` + `done`.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import AsyncIterator, Literal, Mapping, Sequence, TypedDict


# --- public types ---------------------------------------------------

class Message(TypedDict):
    role: Literal["system", "user", "assistant", "tool"]
    content: str


@dataclass
class LLMChunk:
    """One streamed chunk from the provider."""

    kind: Literal["delta", "thinking", "tool_call", "done"]
    delta: str = ""
    finish_reason: str | None = None


class LLMClient:
    """Abstract interface — concrete subclasses: MiniMaxClient (parse 2)."""

    name: str = "abstract"

    async def stream(
        self,
        messages: Sequence[Mapping[str, str]],
        *,
        model: str,
        mode: Literal["chat", "reasoning"] = "chat",
        signal=None,
    ) -> AsyncIterator[LLMChunk]:
        raise NotImplementedError
        yield  # pragma: no cover  (makes type-checker treat this as async-iter)


__all__ = ["LLMClient", "LLMChunk", "Message"]