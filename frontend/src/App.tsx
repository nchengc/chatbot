import { useEffect, useState } from "react";

import { Chat } from "@/pages/Chat";
import { Toast } from "@/components/chat/Toast";
import { apiGet, apiBase, ApiError } from "@/api/client";
import { useSessionStore } from "@/store/sessionStore";
import { useThemeStore } from "@/store/themeStore";

type BackendStatus = "pending" | "ok" | "error";

/**
 * App root — parse 2.
 *
 *  - Probes `/v1/health` on mount so the header pill reflects connectivity.
 *  - Kicks off `loadSessions()` so the backend drives the sidebar.
 *  - Touches the theme store so the persisted theme is applied.
 */
export default function App() {
  useThemeStore.getState(); // applies persisted theme on load
  const loadSessions = useSessionStore((s) => s.loadSessions);
  const loadError = useSessionStore((s) => s.loadError);
  const loading = useSessionStore((s) => s.loading);

  const [status, setStatus] = useState<BackendStatus>("pending");
  const [statusMsg, setStatusMsg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function probe() {
      try {
        const r = await apiGet<{ ok: boolean }>("/v1/health");
        if (!cancelled) {
          setStatus(r.ok ? "ok" : "error");
          setStatusMsg(r.ok ? "" : "unhealthy");
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setStatusMsg(err instanceof Error ? err.message : "unreachable");
      }
    }
    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  return (
    <>
      <Chat
        backendStatus={status}
        statusMsg={statusMsg}
        backendBase={apiBase}
        loading={loading}
        loadError={loadError}
        onRetryLoad={loadSessions}
      />
      <Toast />
    </>
  );
}

// silence unused-import warnings for test envs (kept for type discovery)
export type _ApiError = ApiError;