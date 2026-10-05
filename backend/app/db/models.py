"""SQLModel table definitions.

parse 2 schema (matches plan §4):
  - User      — anonymous, id is browser-side UUID.
  - Session   — chat session; mode controls chat vs reasoning.
  - Message   — a single turn (user / assistant) with optional thinking.

parse 4+ will add a Document table for RAG; v1 keeps the surface tiny.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, Index, String
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    import uuid as _uuid_mod
    return str(_uuid_mod.uuid4())


class User(SQLModel, table=True):
    __tablename__ = "users"  # type: ignore[misnamed]

    id: str = Field(primary_key=True, default_factory=_uuid)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)


class ChatSession(SQLModel, table=True):
    """Chat session.

    `mode` is parsed 2 reserved (parse 3 will actively read/write it).
    Keeping it here means no migration later.
    """

    __tablename__ = "sessions"  # type: ignore[misnamed]
    __table_args__ = (
        Index("ix_sessions_user_updated", "user_id", "updated_at"),
    )

    id: str = Field(primary_key=True, default_factory=_uuid)
    user_id: str = Field(index=True, nullable=False)
    title: str = Field(default="新会话", nullable=False)
    mode: str = Field(default="chat", nullable=False)  # chat | reasoning
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)


class Message(SQLModel, table=True):
    __tablename__ = "messages"  # type: ignore[misnamed]
    __table_args__ = (
        Index("ix_messages_session_created", "session_id", "created_at"),
    )

    id: str = Field(primary_key=True, default_factory=_uuid)
    session_id: str = Field(index=True, nullable=False)
    role: str = Field(nullable=False)  # user | assistant
    content: str = Field(default="", nullable=False)
    thinking: Optional[str] = Field(
        default=None,
        sa_column=Column(String, nullable=True),
    )
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)