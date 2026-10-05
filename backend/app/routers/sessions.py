"""Session CRUD router (parse 2).

Endpoints:
  POST   /v1/sessions                       — create
  GET    /v1/sessions                       — list (most recently updated first)
  PATCH  /v1/sessions/{id}                  — rename / switch mode
  DELETE /v1/sessions/{id}                  — drop session + cascade messages
  GET    /v1/sessions/{id}/messages         — message history
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session as SqlModelSession

from app.db.engine import get_session
from app.deps import get_current_user_id
from app.schemas import (
    MessageRead,
    MessagesResponse,
    SessionCreate,
    SessionPatch,
    SessionRead,
)
from app.services import session_service as svc

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _to_read(sess) -> SessionRead:
    return SessionRead(
        id=sess.id,
        title=sess.title,
        mode=sess.mode,
        created_at=sess.created_at,
        updated_at=sess.updated_at,
    )


@router.post(
    "",
    response_model=SessionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    body: SessionCreate | None = None,
    user_id: str = Depends(get_current_user_id),
    db: SqlModelSession = Depends(get_session),
) -> SessionRead:
    payload = body or SessionCreate()
    sess = svc.create_session(
        db,
        user_id=user_id,
        title=payload.title,
        mode=payload.mode,
    )
    return _to_read(sess)


@router.get("", response_model=List[SessionRead])
def list_sessions(
    user_id: str = Depends(get_current_user_id),
    db: SqlModelSession = Depends(get_session),
) -> List[SessionRead]:
    rows = svc.list_sessions(db, user_id=user_id)
    return [_to_read(r) for r in rows]


@router.patch("/{session_id}", response_model=SessionRead)
def patch_session(
    session_id: str,
    body: SessionPatch,
    user_id: str = Depends(get_current_user_id),
    db: SqlModelSession = Depends(get_session),
) -> SessionRead:
    if body.title is None and body.mode is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="at least one of `title` or `mode` must be provided",
        )
    sess = svc.patch_session(
        db,
        session_id=session_id,
        user_id=user_id,
        title=body.title,
        mode=body.mode,
    )
    if sess is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="session not found",
        )
    return _to_read(sess)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    db: SqlModelSession = Depends(get_session),
) -> None:
    ok = svc.delete_session(db, session_id=session_id, user_id=user_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="session not found",
        )


@router.get("/{session_id}/messages", response_model=MessagesResponse)
def list_messages(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    db: SqlModelSession = Depends(get_session),
) -> MessagesResponse:
    sess = svc.get_session_row(db, session_id=session_id, user_id=user_id)
    if sess is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="session not found",
        )
    rows = svc.list_messages(db, session_id=session_id)
    msgs = [
        MessageRead(
            id=m.id,
            role=m.role,
            content=m.content,
            thinking=m.thinking,
            created_at=m.created_at,
        )
        for m in rows
    ]
    return MessagesResponse(session_id=session_id, messages=msgs)