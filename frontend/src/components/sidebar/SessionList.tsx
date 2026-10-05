import { Pencil, Trash2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/cn";
import { showToast } from "@/lib/toast";
import { useSessionStore, type Session } from "@/store/sessionStore";

interface SessionListProps {
  loading: boolean;
  loadError: string | null;
  onRetryLoad: () => void;
}

export function SessionList({ loading, loadError, onRetryLoad }: SessionListProps) {
  const sessions = useSessionStore((s) => s.sessions);
  const currentId = useSessionStore((s) => s.currentId);
  const createSession = useSessionStore((s) => s.createSession);
  const selectSession = useSessionStore((s) => s.selectSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const renameSession = useSessionStore((s) => s.renameSession);

  const [editingId, setEditingId] = useState<string | null>(null);

  if (loading && sessions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-fg-muted">
        <Loader2 size={16} className="animate-spin" />
        <p className="text-xs">加载中…</p>
      </div>
    );
  }

  if (loadError && sessions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 text-center">
        <AlertCircle size={16} className="text-red-400" />
        <p className="text-xs text-red-300" title={loadError}>
          加载失败
        </p>
        <button
          type="button"
          onClick={onRetryLoad}
          className="btn-ghost mt-1 gap-1.5 border border-border bg-bg-panel px-2.5 py-1 text-xs"
        >
          <RefreshCw size={12} />
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
        {sessions.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                active={s.id === currentId}
                editing={editingId === s.id}
                onSelect={() => selectSession(s.id)}
                onStartRename={() => setEditingId(s.id)}
                onFinishRename={async (title) => {
                  setEditingId(null);
                  if (title.trim() && title !== s.title) {
                    try {
                      await renameSession(s.id, title.trim());
                    } catch (err) {
                      showToast(
                        err instanceof Error ? err.message : "重命名失败",
                        2200,
                      );
                    }
                  }
                }}
                onDelete={async () => {
                  if (window.confirm(`删除会话「${s.title}」？`)) {
                    try {
                      await deleteSession(s.id);
                      showToast("已删除", 1200);
                    } catch (err) {
                      showToast(
                        err instanceof Error ? err.message : "删除失败",
                        2200,
                      );
                    }
                  }
                }}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => {
            void createSession();
          }}
          className="btn-ghost w-full justify-start gap-2 border border-dashed border-border-strong text-fg-subtle hover:text-fg"
        >
          <Pencil size={14} />
          新建会话
        </button>
      </div>
    </div>
  );
}

interface SessionRowProps {
  session: Session;
  active: boolean;
  editing: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onFinishRename: (title: string) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}

function SessionRow({
  session,
  active,
  editing,
  onSelect,
  onStartRename,
  onFinishRename,
  onDelete,
}: SessionRowProps) {
  const [draft, setDraft] = useState(session.title);

  return (
    <li
      className={cn(
        "group relative flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
        active ? "bg-bg-panel text-fg" : "text-fg-subtle hover:bg-bg-panel hover:text-fg",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        onDoubleClick={onStartRename}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        title={session.title}
      >
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
            session.mode === "reasoning" ? "bg-violet-400" : "bg-fg-muted",
          )}
        />
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void onFinishRename(draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onFinishRename(draft);
              if (e.key === "Escape") void onFinishRename(session.title);
            }}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 rounded border border-border bg-bg px-1 py-0.5 text-sm text-fg focus:border-accent focus:outline-none"
          />
        ) : (
          <span className="truncate">{session.title}</span>
        )}
      </button>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStartRename();
          }}
          className="rounded p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"
          title="重命名"
          aria-label="重命名"
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void onDelete();
          }}
          className="rounded p-1 text-fg-muted hover:bg-red-900/40 hover:text-red-300"
          title="删除"
          aria-label="删除"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-6 text-center text-fg-muted">
      <p className="text-xs">暂无会话</p>
      <p className="mt-1 text-[11px] leading-relaxed">
        点击下方「新建会话」开始
      </p>
    </div>
  );
}