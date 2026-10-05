"""Session / message persistence service.

parse 2 keeps CRUD dead simple: every operation that mutates a session
also bumps `updated_at` so the sidebar order stays freshest-first.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional, Sequence

from sqlmodel import Session as SqlModelSession
from sqlmodel import select

from app.db.engine import get_session
from app.db.models import ChatSession, Message


# ----------------------------- helpers --------------------------------

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _touch(sess: ChatSession) -> ChatSession:
    sess.updated_at = _utcnow()
    return sess


# ----------------------------- sessions --------------------------------

def create_session(
    db: SqlModelSession,
    *,
    user_id: str,
    title: Optional[str] = None,
    mode: str = "chat",
) -> ChatSession:
    sess = ChatSession(
        user_id=user_id,
        title=title or "新会话",
        mode=mode,
    )
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return sess


def list_sessions(
    db: SqlModelSession,
    *,
    user_id: str,
    limit: int = 100,
) -> List[ChatSession]:
    stmt = (
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc())
        .limit(limit)
    )
    return list(db.exec(stmt).all())


def get_session_row(
    db: SqlModelSession,
    *,
    session_id: str,
    user_id: str,
) -> Optional[ChatSession]:
    stmt = select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.user_id == user_id,
    )
    return db.exec(stmt).first()


def patch_session(
    db: SqlModelSession,
    *,
    session_id: str,
    user_id: str,
    title: Optional[str] = None,
    mode: Optional[str] = None,
) -> Optional[ChatSession]:
    sess = get_session_row(db, session_id=session_id, user_id=user_id)
    if sess is None:
        return None
    if title is not None:
        sess.title = title
    if mode is not None:
        sess.mode = mode
    _touch(sess)
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return sess


def delete_session(
    db: SqlModelSession,
    *,
    session_id: str,
    user_id: str,
) -> bool:
    sess = get_session_row(db, session_id=session_id, user_id=user_id)
    if sess is None:
        return False
    # cascade: drop messages first (no ON DELETE CASCADE in SQLite by default)
    msg_stmt = select(Message).where(Message.session_id == session_id)
    for m in db.exec(msg_stmt).all():
        db.delete(m)
    db.delete(sess)
    db.commit()
    return True


# ----------------------------- messages -------------------------------

def add_user_message(
    db: SqlModelSession,
    *,
    session_id: str,
    content: str,
) -> Message:
    sess = get_session_row(db, session_id=session_id, user_id="")  # placeholder
    return _insert_message(db, session_id=session_id, content=content, role="user")


def add_assistant_message(
    db: SqlModelSession,
    *,
    session_id: str,
    content: str,
    thinking: Optional[str] = None,
) -> Message:
    return _insert_message(
        db,
        session_id=session_id,
        content=content,
        role="assistant",
        thinking=thinking,
    )


def _insert_message(
    db: SqlModelSession,
    *,
    session_id: str,
    content: str,
    role: str,
    thinking: Optional[str] = None,
) -> Message:
    msg = Message(
        session_id=session_id,
        role=role,
        content=content,
        thinking=thinking,
    )
    db.add(msg)
    # Bump the parent session's updated_at so list order is fresh-first.
    parent = db.get(ChatSession, session_id)
    if parent is not None:
        _touch(parent)
        db.add(parent)
    db.commit()
    db.refresh(msg)
    return msg


def list_messages(
    db: SqlModelSession,
    *,
    session_id: str,
    limit: int = 200,
) -> List[Message]:
    stmt = (
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
    )
    return list(db.exec(stmt).all())


def history_for_llm(
    db: SqlModelSession,
    *,
    session_id: str,
) -> List[dict]:
    """Return the most recent turns as `{role, content}` dicts."""
    rows = list_messages(db, session_id=session_id)
    return [{"role": r.role, "content": r.content} for r in rows]


__all__ = [
    "create_session",
    "list_sessions",
    "get_session_row",
    "patch_session",
    "delete_session",
    "add_user_message",
    "add_assistant_message",
    "list_messages",
    "history_for_llm",
]