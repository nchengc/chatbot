"""Mock LLM for parse 2 / parse 3 tests — emulates MiniMax SSE without network."""
from __future__ import annotations

import asyncio
from typing import AsyncIterator, Literal, Mapping, Sequence

from app.services.llm.base import LLMClient, LLMChunk


class MockMiniMaxClient(LLMClient):
    name = "mock-minimax"

    def __init__(
        self,
        *,
        reply: str = "你好！这是 mock MiniMax 回答。",
        thinking: str = "",
        delay: float = 0.02,
    ):
        self.reply = reply
        # Only emitted when `mode == "reasoning"`.
        self.thinking = thinking
        self.delay = delay

    async def stream(
        self,
        messages: Sequence[Mapping[str, str]],
        *,
        model: str | None = None,
        mode: Literal["chat", "reasoning"] = "chat",
        signal=None,
    ) -> AsyncIterator[LLMChunk]:
        if mode == "reasoning" and self.thinking:
            for ch in self.thinking:
                if signal is not None and getattr(signal, "cancelled", False):
                    return
                yield LLMChunk(kind="thinking", delta=ch)
                await asyncio.sleep(self.delay)

        for ch in self.reply:
            if signal is not None and getattr(signal, "cancelled", False):
                return
            yield LLMChunk(kind="delta", delta=ch)
            await asyncio.sleep(self.delay)
        yield LLMChunk(kind="done", finish_reason="stop")