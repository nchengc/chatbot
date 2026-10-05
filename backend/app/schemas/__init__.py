"""Request / response schemas.

parse 2 keeps the surface minimal: chat (request), session (CRUD),
and the LLM-emitted streaming events (returned as dicts via app.utils.sse).
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ----------------------------- chat -----------------------------------

class ChatRequest(BaseModel):
    session_id: str = Field(..., description="Target chat session UUID")
    content: str = Field(..., min_length=1, description="User message text")
    mode: Literal["chat", "reasoning"] = Field(
        default="chat",
        description="parse 2 = chat only; parse 3 unlocks reasoning.",
    )
    # parse 3 will add `model: Optional[str]` for choosing intensity.


# ----------------------------- sessions -------------------------------

class SessionCreate(BaseModel):
    title: Optional[str] = None
    mode: Literal["chat", "reasoning"] = "chat"


class SessionPatch(BaseModel):
    title: Optional[str] = None
    mode: Optional[Literal["chat", "reasoning"]] = None


class SessionRead(BaseModel):
    id: str
    title: str
    mode: str
    created_at: datetime
    updated_at: datetime


class MessageRead(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    thinking: Optional[str] = None
    created_at: datetime


class MessagesResponse(BaseModel):
    session_id: str
    messages: List[MessageRead]