"""SQLModel engine + session factory.

parse 2 introduces persistence: User / Session / Message tables in SQLite.
parse 4+ will reuse the same engine for RAG metadata.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Iterator

from sqlmodel import Session, SQLModel, create_engine

from app.config import settings

# Resolve SQLite path relative to the backend root so the file lives
# in `./data/app.db` (gitignored).
def _sqlite_path_from(url: str) -> str:
    """`sqlite:///./data/app.db` → absolute path."""
    prefix = "sqlite:///"
    if not url.startswith(prefix):
        return url
    rel = url[len(prefix):]
    backend_root = Path(__file__).resolve().parent.parent.parent
    abs_path = (backend_root / rel).resolve()
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{abs_path.as_posix()}"


database_url = (
    _sqlite_path_from(settings.database_url)
    if settings.database_url.startswith("sqlite")
    else settings.database_url
)

# `check_same_thread=False` is the standard pattern for SQLite with
# FastAPI; SQLModel handles connection pooling internally.
connect_args = (
    {"check_same_thread": False}
    if database_url.startswith("sqlite")
    else {}
)

engine = create_engine(
    database_url,
    echo=False,
    connect_args=connect_args,
)


def init_db() -> None:
    """Create all tables. Called once at startup."""
    # Imported here to avoid circular imports at module load.
    from app.db import models  # noqa: F401  (registers tables on SQLModel)

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a SQLModel session.

    Usage in a router::

        @router.get(...)
        def handler(session: Session = Depends(get_session)): ...
    """
    with Session(engine) as session:
        yield session