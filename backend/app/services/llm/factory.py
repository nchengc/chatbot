"""LLM client factory.

parse 2: only the MiniMax client is wired. parse 3 keeps the same surface
but the `reasoning_model` env var becomes required for the reasoning mode
to actually do something useful.
"""
from __future__ import annotations

import logging
from functools import lru_cache

from app.config import settings
from app.services.llm.base import LLMClient
from app.services.llm.minimax import MiniMaxClient

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_llm_client() -> LLMClient | None:
    """Return the singleton LLM client, or None if not configured.

    parse 2 still works when this returns None — the chat router will
    surface a friendly 503. parse 3 makes a valid config mandatory.
    """
    if not settings.minimax_base_url or not settings.minimax_api_key:
        logger.warning(
            "MiniMax not configured (base_url / api_key missing); "
            "/v1/chat/completions will return 503.",
        )
        return None
    if not settings.minimax_chat_model:
        logger.warning(
            "MINIMAX_CHAT_MODEL is empty; /v1/chat/completions will return 503.",
        )
        return None
    return MiniMaxClient(
        base_url=settings.minimax_base_url,
        api_key=settings.minimax_api_key,
        chat_model=settings.minimax_chat_model,
        reasoning_model=settings.minimax_reasoning_model,
    )