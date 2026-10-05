/**
 * Session store — parse 2.
 *
 * Persistence model:
 *   - Sessions + messages live in the backend (SQLite).
 *   - On mount, `loadSessions()` fetches the user's sessions from
 *     `/v1/sessions`.
 *   - `sendMessage()` POSTs to `/v1/chat/completions` and accumulates
 *     the SSE stream into the local store.
 *   - Local state is the source of truth for rendering; the backend is
 *     the source of truth across reloads.
 */
import { create } from "zustand";

import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  patchSession,
  streamChat,
  type ChatMode,
  type MessageDTO,
  type SessionDTO,
} from "@/api/client";

export type Role = "user" | "assistant";
export type { ChatMode };

export interface Message {
  id: string;
  role: Role;
  content: string;
  thinking: string;
  isStreaming: boolean;
  /** Server-assigned id (only set once `meta` event arrives). */
  serverId?: string;
}

export interface Session {
  id: string;
  title: string;
  mode: ChatMode;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

interface SessionState {
  sessions: Session[];
  currentId: string | null;
  /** id of the assistant message currently streaming (null = idle). */
  streamingMessageId: string | null;
  /** id of the assistant message whose content we haven't fetched back yet */
  pendingServerId: string | null;
  /** True until the first GET /v1/sessions resolves. */
  loading: boolean;
  /** Set to true if loading fails (shows a recoverable error banner). */
  loadError: string | null;
  /** Mode chosen on the dropdown before any session exists; forwarded to the next createSession. */
  pendingMode: ChatMode;

  /* ----- async lifecycle ----- */
  loadSessions: () => Promise<void>;
  loadMessages: (sessionId: string) => Promise<void>;

  /* ----- session ops ----- */
  createSession: (title?: string, mode?: ChatMode) => Promise<string>;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  /**
   * PATCH /v1/sessions/{id} with the new mode and replace the local row
   * from the server response (server is source of truth — mirrors
   * renameSession). If no session exists yet, store the requested mode
   * in `pendingMode` so the next createSession() can forward it.
   */
  setMode: (mode: ChatMode) => Promise<void>;

  /* ----- chat ----- */
  sendMessage: (content: string) => Promise<void>;
  cancelStream: () => void;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function deriveTitle(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  return trimmed.length === 0 ? "新会话" : trimmed.slice(0, 24);
}

function dtoToSession(dto: SessionDTO, messages: Message[] = []): Session {
  return {
    id: dto.id,
    title: dto.title,
    mode: dto.mode,
    createdAt: Date.parse(dto.created_at),
    updatedAt: Date.parse(dto.updated_at),
    messages,
  };
}

function dtoToMessage(dto: MessageDTO): Message {
  return {
    id: dto.id,
    role: dto.role,
    content: dto.content,
    thinking: dto.thinking ?? "",
    isStreaming: false,
    serverId: dto.id,
  };
}

export const useSessionStore = create<SessionState>((set, get) => {
  // Active stream controller; only one in-flight at a time.
  let activeAbort: AbortController | null = null;

  function bumpUpdatedAt(sessions: Session[], id: string): Session[] {
    const now = Date.now();
    return sessions.map((s) => (s.id === id ? { ...s, updatedAt: now } : s));
  }

  return {
    sessions: [],
    currentId: null,
    streamingMessageId: null,
    pendingServerId: null,
    loading: false,
    loadError: null,
    pendingMode: "chat",

    /* ----- lifecycle ----- */
    loadSessions: async () => {
      set({ loading: true, loadError: null });
      try {
        const rows = await apiGet<SessionDTO[]>("/v1/sessions");
        const sessions = rows
          .map((dto) => dtoToSession(dto))
          .sort((a, b) => b.updatedAt - a.updatedAt);
        // Auto-select the most recent session if none is active.
        const cur = get().currentId;
        const valid = sessions.find((s) => s.id === cur);
        const currentId = valid ? cur : (sessions[0]?.id ?? null);
        set({ sessions, currentId, loading: false });
      } catch (err) {
        set({
          loading: false,
          loadError: err instanceof Error ? err.message : "Failed to load",
        });
      }
    },

    loadMessages: async (sessionId) => {
      try {
        const resp = await apiGet<{ messages: MessageDTO[] }>(
          `/v1/sessions/${sessionId}/messages`,
        );
        const messages = resp.messages.map(dtoToMessage);
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId ? { ...sess, messages } : sess,
          ),
        }));
      } catch (err) {
        console.error("loadMessages failed", err);
      }
    },

    /* ----- session ops ----- */
    createSession: async (title, mode) => {
      // Honor the most recently chosen mode when no session row exists yet.
      const requested = mode ?? get().pendingMode ?? "chat";
      const dto = await apiPost<SessionDTO>("/v1/sessions", {
        title: title ?? null,
        mode: requested,
      });
      const fresh = dtoToSession(dto);
      set((s) => ({
        sessions: [fresh, ...s.sessions],
        currentId: fresh.id,
        // Once we have a real row, the dropdown owns mode via PATCH;
        // clear pendingMode so a future "no session" state doesn't
        // leak the last pick into a fresh row.
        pendingMode: "chat",
      }));
      return fresh.id;
    },

    selectSession: (id) => {
      if (activeAbort) activeAbort.abort();
      activeAbort = null;
      const exists = get().sessions.some((s) => s.id === id);
      if (!exists) return;
      set({
        currentId: id,
        streamingMessageId: null,
      });
      // Lazy-load messages (cheap, idempotent if already in store).
      void get().loadMessages(id);
    },

    deleteSession: async (id) => {
      await apiDelete<void>(`/v1/sessions/${id}`);
      set((s) => {
        const remaining = s.sessions.filter((x) => x.id !== id);
        const nextCurrent =
          s.currentId === id ? (remaining[0]?.id ?? null) : s.currentId;
        return { sessions: remaining, currentId: nextCurrent };
      });
      const next = get().sessions[0];
      if (next) {
        await get().loadMessages(next.id);
      }
    },

    renameSession: async (id, title) => {
      const dto = await apiPatch<SessionDTO>(`/v1/sessions/${id}`, { title });
      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id === id ? { ...sess, title: dto.title } : sess,
        ),
      }));
    },

    setMode: async (mode) => {
      const { currentId } = get();
      if (!currentId) {
        // No session row yet — remember the pick so createSession() forwards it.
        set({ pendingMode: mode });
        return;
      }
      try {
        const dto = await patchSession(currentId, { mode });
        // Merge the server-confirmed DTO into the local row (server wins).
        const incoming = dtoToSession(dto, get().sessions.find((s) => s.id === currentId)?.messages ?? []);
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === currentId ? { ...sess, ...incoming, messages: sess.messages } : sess,
          ),
        }));
      } catch (err) {
        // Re-throw so the UI can surface a toast; local state is untouched.
        throw err instanceof Error ? err : new Error(String(err));
      }
    },

    /* ----- chat ----- */
    sendMessage: async (content) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      if (activeAbort) activeAbort.abort();

      const state = get();
      let sessionId = state.currentId;
      // Read the mode at call time so a dropdown toggle on an existing
      // session row is honored on the very next send.
      let activeMode: ChatMode =
        state.sessions.find((s) => s.id === sessionId)?.mode ?? state.pendingMode ?? "chat";
      if (!sessionId) {
        sessionId = await get().createSession();
        // After create, the freshly persisted row is the source of truth.
        activeMode =
          get().sessions.find((s) => s.id === sessionId)?.mode ?? activeMode;
      }

      const userMsg: Message = {
        id: "m-" + uuid(),
        role: "user",
        content: trimmed,
        thinking: "",
        isStreaming: false,
      };
      const assistantMsg: Message = {
        id: "m-" + uuid(),
        role: "assistant",
        content: "",
        thinking: "",
        isStreaming: true,
      };

      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id !== sessionId
            ? sess
            : {
                ...sess,
                title:
                  sess.messages.length === 0
                    ? deriveTitle(trimmed)
                    : sess.title,
                messages: [...sess.messages, userMsg, assistantMsg],
              },
        ),
        streamingMessageId: assistantMsg.id,
      }));

      const controller = new AbortController();
      activeAbort = controller;

      try {
        for await (const ev of streamChat(
          { session_id: sessionId, content: trimmed, mode: activeMode },
          controller.signal,
        )) {
          if (controller.signal.aborted) break;
          if (ev.event === "meta") {
            set((s) => ({
              sessions: s.sessions.map((sess) =>
                sess.id !== sessionId
                  ? sess
                  : {
                      ...sess,
                      messages: sess.messages.map((m) =>
                        m.id !== assistantMsg.id
                          ? m
                          : { ...m, serverId: ev.data.message_id },
                      ),
                    },
              ),
            }));
          } else if (ev.event === "message") {
            set((s) => ({
              sessions: s.sessions.map((sess) =>
                sess.id !== sessionId
                  ? sess
                  : {
                      ...sess,
                      messages: sess.messages.map((m) =>
                        m.id !== assistantMsg.id
                          ? m
                          : {
                              ...m,
                              content: m.content + ev.data.delta,
                              isStreaming: true,
                            },
                      ),
                    },
              ),
            }));
          } else if (ev.event === "thinking") {
            // parse 3 will surface; parse 2 silently appends so the local
            // state stays consistent if the provider surprises us.
            set((s) => ({
              sessions: s.sessions.map((sess) =>
                sess.id !== sessionId
                  ? sess
                  : {
                      ...sess,
                      messages: sess.messages.map((m) =>
                        m.id !== assistantMsg.id
                          ? m
                          : {
                              ...m,
                              thinking: m.thinking + ev.data.delta,
                              isStreaming: true,
                            },
                      ),
                    },
              ),
            }));
          } else if (ev.event === "done") {
            break;
          } else if (ev.event === "error") {
            // Surface as a trailing content line.
            set((s) => ({
              sessions: s.sessions.map((sess) =>
                sess.id !== sessionId
                  ? sess
                  : {
                      ...sess,
                      messages: sess.messages.map((m) =>
                        m.id !== assistantMsg.id
                          ? m
                          : {
                              ...m,
                              content:
                                m.content +
                                `\n\n⚠️ ${ev.data.message || ev.data.type}`,
                              isStreaming: false,
                            },
                      ),
                    },
              ),
            }));
            break;
          }
        }
      } finally {
        activeAbort = null;
        // Finalize the assistant message and bump updated_at.
        set((s) => ({
          streamingMessageId: null,
          sessions: bumpUpdatedAt(
            s.sessions.map((sess) =>
              sess.id !== sessionId
                ? sess
                : {
                    ...sess,
                    messages: sess.messages.map((m) =>
                      m.id !== assistantMsg.id ? m : { ...m, isStreaming: false },
                    ),
                  },
            ),
            sessionId,
          ),
        }));
      }
    },

    cancelStream: () => {
      if (activeAbort) activeAbort.abort();
      activeAbort = null;
      const mid = get().streamingMessageId;
      if (mid) {
        set((s) => ({
          streamingMessageId: null,
          sessions: s.sessions.map((sess) => ({
            ...sess,
            messages: sess.messages.map((m) =>
              m.id !== mid ? m : { ...m, isStreaming: false },
            ),
          })),
        }));
      }
    },
  };
});

export const selectCurrentMessages = (s: SessionState): Message[] => {
  const sess = s.sessions.find((x) => x.id === s.currentId);
  return sess?.messages ?? [];
};

export const selectIsStreaming = (s: SessionState): boolean =>
  s.streamingMessageId !== null;