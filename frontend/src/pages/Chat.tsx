import { useMemo } from "react";

import { HeaderBar } from "@/components/chat/HeaderBar";
import { InputBox } from "@/components/chat/InputBox";
import { MessageList } from "@/components/chat/MessageList";
import { SessionList } from "@/components/sidebar/SessionList";
import { showToast } from "@/lib/toast";
import {
  selectCurrentMessages,
  selectIsStreaming,
  useSessionStore,
} from "@/store/sessionStore";

interface ChatProps {
  backendStatus: "pending" | "ok" | "error";
  statusMsg: string;
  backendBase: string;
  loading: boolean;
  loadError: string | null;
  onRetryLoad: () => void;
}

/**
 * Chat page — parse 2.
 *
 * Composition:
 *   - Left sidebar: SessionList (real /v1/sessions data)
 *   - Right pane: HeaderBar + MessageList + InputBox
 *
 * All state comes from `useSessionStore` which proxies to the backend.
 */
export function Chat({
  backendStatus,
  statusMsg,
  backendBase,
  loading,
  loadError,
  onRetryLoad,
}: ChatProps) {
  const messages = useSessionStore(selectCurrentMessages);
  const isStreaming = useSessionStore(selectIsStreaming);
  const mode = useSessionStore((s) =>
    s.sessions.find((x) => x.id === s.currentId)?.mode ?? s.pendingMode,
  );
  const sendMessage = useSessionStore((s) => s.sendMessage);
  const cancelStream = useSessionStore((s) => s.cancelStream);
  const setMode = useSessionStore((s) => s.setMode);

  const stableMessages = useMemo(() => messages, [messages]);

  async function handleModeChange(next: "chat" | "reasoning"): Promise<void> {
    if (next === mode) return;
    try {
      await setMode(next);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "切换模式失败",
        2200,
      );
    }
  }

  return (
    <div className="flex h-full w-full bg-bg">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-bg-subtle md:flex">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            会话
          </span>
          <BackendDot status={backendStatus} />
        </div>
        <SessionList
          loading={loading}
          loadError={loadError}
          onRetryLoad={onRetryLoad}
        />
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <HeaderBar
          mode={mode}
          backendStatus={backendStatus}
          statusMsg={statusMsg}
          backendBase={backendBase}
          isStreaming={isStreaming}
          onModeChange={(m) => void handleModeChange(m)}
        />
        <MessageList messages={stableMessages} isStreaming={isStreaming} mode={mode} />
        <InputBox
          onSend={sendMessage}
          onStop={cancelStream}
          isStreaming={isStreaming}
        />
      </main>
    </div>
  );
}

function BackendDot({ status }: { status: "pending" | "ok" | "error" }) {
  const cls =
    status === "ok"
      ? "bg-emerald-400"
      : status === "pending"
        ? "bg-amber-400 animate-pulse"
        : "bg-red-500";
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${cls}`}
      title={
        status === "ok"
          ? "后端已连通"
          : status === "pending"
            ? "连接中…"
            : "后端不可达"
      }
    />
  );
}