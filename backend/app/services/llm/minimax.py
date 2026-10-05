"""MiniMax-M3 client.

parse 2 target. Talks to MiniMax via its OpenAI-compatible chat-completions
endpoint, supports async streaming, and converts provider chunks into our
internal `LLMChunk` shape.

We deliberately avoid pulling the `openai` SDK so we stay light (and don't
need to update a vendored SDK every release). `httpx` (in our deps already)
is enough.
"""
from __future__ import annotations

import json
import logging
from typing import AsyncIterator, Literal, Mapping, Sequence

import httpx

from app.services.llm.base import LLMClient, LLMChunk

logger = logging.getLogger(__name__)


class MiniMaxConfigError(RuntimeError):
    """Raised when required MiniMax env vars are missing."""


class MiniMaxClient(LLMClient):
    """OpenAI-compatible chat completions client."""

    name = "minimax"

    def __init__(
        self,
        *,
        base_url: str,
        api_key: str,
        chat_model: str,
        reasoning_model: str = "",
        timeout: float = 60.0,
    ) -> None:
        if not base_url or not api_key:
            raise MiniMaxConfigError(
                "MINIMAX_BASE_URL and MINIMAX_API_KEY must both be set"
            )
        if not chat_model:
            raise MiniMaxConfigError(
                "MINIMAX_CHAT_MODEL must be set (parse 2 prerequisite)"
            )

        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.chat_model = chat_model
        self.reasoning_model = reasoning_model
        self._client = httpx.AsyncClient(
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def stream(
        self,
        messages: Sequence[Mapping[str, str]],
        *,
        model: str | None = None,
        mode: Literal["chat", "reasoning"] = "chat",
        signal=None,
    ) -> AsyncIterator[LLMChunk]:
        # pick model by mode (parse 3 hook)
        if mode == "reasoning" and self.reasoning_model:
            chosen_model = self.reasoning_model
        else:
            chosen_model = model or self.chat_model

        payload: dict = {
            "model": chosen_model,
            "messages": list(messages),
            "stream": True,
            # parse 3: surface the active mode so providers / mocks can
            # branch on it. Not part of the OpenAI spec but harmless if
            # ignored by real upstream.
            "mode": mode,
            # parse 3: opt into reasoning-content streaming when the
            # provider supports it. Real upstream may ignore this flag.
            "thinking": mode == "reasoning",
        }

        logger.info(
            "MiniMax stream: model=%s mode=%s msgs=%d",
            chosen_model,
            mode,
            len(messages),
        )

        req = self._client.build_request(
            "POST",
            f"{self.base_url}/chat/completions",
            json=payload,
        )
        response = await self._client.send(req, stream=True)

        if response.status_code >= 400:
            # Don't close the underlying httpx client — the singleton is
            # reused across requests and closing once would break all later
            # calls. Just surface the body.
            body = await response.aread()
            await response.aclose()
            text = body.decode("utf-8", "replace")
            logger.error("MiniMax HTTP %s: %s", response.status_code, text)
            raise RuntimeError(
                f"MiniMax returned {response.status_code}: {text[:300]}"
            )

        finish_reason: str | None = None
        async for raw_line in response.aiter_lines():
            if signal is not None and getattr(signal, "cancelled", False):
                # Best-effort cancel; close the stream.
                await response.aclose()
                return

            line = raw_line.strip()
            if not line:
                continue
            if line.startswith(":"):  # keep-alive comment
                continue
            if not line.startswith("data:"):
                logger.debug("MiniMax non-data line: %s", line[:120])
                continue

            data = line[len("data:"):].strip()
            if data == "[DONE]":
                break

            try:
                obj = json.loads(data)
            except json.JSONDecodeError:
                logger.warning("MiniMax non-JSON chunk: %s", data[:120])
                continue

            for obj_delta in _extract_deltas(obj):
                yield obj_delta
            fr = _extract_finish_reason(obj)
            if fr:
                finish_reason = fr

        yield LLMChunk(kind="done", finish_reason=finish_reason or "stop")


# -------------------------------------------------------------------- #
# helpers                                                              #
# -------------------------------------------------------------------- #

def _extract_deltas(obj: dict) -> list[LLMChunk]:
    """Yield one or more LLMChunks from a single provider JSON frame.

    OpenAI-compatible providers put the message delta at::

        choices[0].delta.content

    Some reasoning models additionally emit::

        choices[0].delta.reasoning_content
    """
    chunks: list[LLMChunk] = []
    choices = obj.get("choices") or []
    for c in choices:
        delta = c.get("delta") or {}
        if not isinstance(delta, dict):
            continue
        # Reasoning content (parse 3 path)
        rc = delta.get("reasoning_content")
        if isinstance(rc, str) and rc:
            chunks.append(LLMChunk(kind="thinking", delta=rc))
        # Regular content
        content = delta.get("content")
        if isinstance(content, str) and content:
            chunks.append(LLMChunk(kind="delta", delta=content))
    return chunks


def _extract_finish_reason(obj: dict) -> str | None:
    choices = obj.get("choices") or []
    if not choices:
        return None
    return choices[0].get("finish_reason")