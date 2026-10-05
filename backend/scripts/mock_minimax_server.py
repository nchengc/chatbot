"""Tiny stand-in for the MiniMax chat-completions API.

Run: `python scripts/mock_minimax_server.py`

Implements `POST /v1/chat/completions` with an OpenAI-compatible SSE
response so the parse 3 backend can exercise its full code path
without external network access.

When `payload.mode == "reasoning"`, the mock additionally emits a short
`reasoning_content` stream before the visible reply, so the
`thinking` SSE branch and `Message.thinking` persistence can be
exercised end-to-end.
"""
from __future__ import annotations

import asyncio
import json
import time
from typing import Any, AsyncIterator

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse

app = FastAPI(title="mock-minimax")


async def _chunks(
    text: str, *, reasoning: str = ""
) -> AsyncIterator[bytes]:
    """Yield OpenAI-style SSE chunks, one per char.

    Reasoning content (if any) is emitted first, then the visible reply.
    """
    created = int(time.time())
    chat_id = f"chatcmpl-mock-{created}"
    model = "MiniMax-M3-mock"

    def frame(delta: dict[str, Any], finish: str | None = None) -> str:
        choice: dict[str, Any] = {"index": 0, "delta": delta}
        if finish:
            choice["finish_reason"] = finish
        obj = {
            "id": chat_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [choice],
        }
        return "data: " + json.dumps(obj, ensure_ascii=False) + "\n\n"

    # initial role marker
    yield frame({"role": "assistant"}).encode()

    # parse 3: reasoning model emits thinking first
    for ch in reasoning:
        yield frame({"reasoning_content": ch}).encode()
        await asyncio.sleep(0.01)

    for ch in text:
        yield frame({"content": ch}).encode()
        await asyncio.sleep(0.02)

    yield frame({}, finish="stop").encode()
    yield b"data: [DONE]\n\n"


@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    payload = await request.json()
    msgs = payload.get("messages") or []
    user_msg = next(
        (m["content"] for m in reversed(msgs) if m.get("role") == "user"),
        "",
    )
    reply = (
        f"Mock MiniMax 收到你的消息「{user_msg}」。\n\n"
        "这是一个**流式测试**响应，用于验证 parse 3 后端接通：\n\n"
        "- ✅ SSE 事件序列：meta → message → done\n"
        "- ✅ 推理模式：meta → thinking → message → done\n"
        "- ✅ 字符级流式返回\n"
        "- ✅ SQLite 落库 + thinking 字段\n"
        "- ✅ MiniMax SDK 兼容层\n"
        "\n"
        "```python\n"
        "def parse3():\n"
        "    return 'reasoning mode emits thinking chunks to the client'\n"
        "```"
    )
    reasoning = (
        "用户问了一个问题，我先识别意图，再决定走哪个分支……\n"
        "1. 解析用户输入\n"
        "2. 调取相关上下文\n"
        "3. 生成回复"
    )
    use_reasoning = payload.get("mode") == "reasoning"
    return StreamingResponse(
        _chunks(reply, reasoning=reasoning if use_reasoning else ""),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


@app.get("/v1/models")
async def models():
    return {"data": [{"id": "MiniMax-M3-mock"}]}


if __name__ == "__main__":  # pragma: no cover
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=9999, log_level="warning")