"""Chat router — parse 3.

`POST /v1/chat/completions` returns an SSE stream following the event
sequence defined in plan §5.1:

    event: meta            { session_id, message_id, mode }
    event: thinking        { delta }                (zero or more, reasoning mode only)
    event: message         { delta }                (one or more)
    event: done            { finish_reason, thinking_complete }

parse 2 already accepted `mode` in the request body; parse 3 actively
emits `thinking` events and persists `Message.thinking`.
"""
from __future__ import annotations

import logging
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session as SqlModelSession

from app.db.engine import get_session
from app.db.models import Message as MessageModel
from app.deps import get_current_user_id
from app.schemas import ChatRequest
from app.services import session_service as svc
from app.services.llm import get_llm_client
from app.services.llm.base import LLMChunk
from app.services.prompt import build_messages
from app.utils.sse import format_done, format_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/completions")
async def chat_completions(
    body: ChatRequest,
    user_id: str = Depends(get_current_user_id),
    db: SqlModelSession = Depends(get_session),
) -> StreamingResponse:
    # 1. verify session ownership
    sess = svc.get_session_row(
        db, session_id=body.session_id, user_id=user_id
    )
    if sess is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="session not found",
        )

    # 2. verify LLM is configured
    client = get_llm_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "LLM not available. Verify `MINIMAX_BASE_URL`, "
                "`MINIMAX_API_KEY`, and `MINIMAX_CHAT_MODEL` are set."
            ),
        )

    # 3. persist the user message immediately
    user_msg = svc.add_user_message(
        db, session_id=body.session_id, content=body.content
    )

    # 4. assemble the LLM message list from history
    history = svc.history_for_llm(db, session_id=body.session_id)
    messages = build_messages(history)

    # 5. reserve an assistant message row, fill it as the stream produces
    assistant_msg = svc.add_assistant_message(
        db, session_id=body.session_id, content="", thinking=""
    )

    # 6. SSE generator
    async def event_source() -> AsyncIterator[bytes]:
        nonlocal assistant_msg  # noqa: F821

        yield format_event(
            "meta",
            {
                "session_id": body.session_id,
                "message_id": assistant_msg.id,
                "mode": body.mode,
            },
        )

        accumulated_content: list[str] = []
        accumulated_thinking: list[str] = []
        thinking_complete = True  # flip to False if the provider aborts mid-thinking
        try:
            async for chunk in client.stream(
                messages, model=None, mode=body.mode
            ):
                if chunk.kind == "delta":
                    accumulated_content.append(chunk.delta)
                    yield format_event("message", {"delta": chunk.delta})
                elif chunk.kind == "thinking":
                    accumulated_thinking.append(chunk.delta)
                    yield format_event("thinking", {"delta": chunk.delta})
                elif chunk.kind == "done":
                    break
        except Exception as exc:  # pragma: no cover — surfaced to client
            logger.exception("MiniMax stream failed")
            thinking_complete = False
            yield format_event(
                "error",
                {"message": str(exc)[:500], "type": exc.__class__.__name__},
            )
            yield format_done(
                {"finish_reason": "error", "thinking_complete": False}
            )
            return

        full_content = "".join(accumulated_content)
        full_thinking = "".join(accumulated_thinking)

        # 7. finalise the assistant message in SQLite
        try:
            fresh = db.get(MessageModel, assistant_msg.id)
            if fresh is not None:
                fresh.content = full_content
                if full_thinking:
                    fresh.thinking = full_thinking
                db.add(fresh)
                db.commit()
        except Exception as exc:  # pragma: no cover
            logger.warning("Could not persist assistant message: %s", exc)

        yield format_done(
            {"finish_reason": "stop", "thinking_complete": thinking_complete}
        )

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable Nginx buffering when deployed
        },
    )


__all__ = ["router", "LLMChunk"]