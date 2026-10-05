/**
 * Fetch wrapper + SSE stream consumer.
 *
 * Responsibilities:
 *   - Resolve base URL from `VITE_API_BASE` (fallback to localhost:8000).
 *   - Inject `X-User-Id` header on every request (anonymous UUID from localStorage).
 *   - Throw a typed `ApiError` so callers can branch on status / message.
 *   - `streamChat()` returns an AsyncGenerator of typed SSE events.
 *
 * parse 0/1: client only.
 * parse 2: SSE consumer + session/message fetchers.
 * parse 3: `thinking` event will be added.
 */

const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/+$/, "") ||
  "http://localhost:8000";

/** Reads the anonymous user UUID from localStorage (no Zustand dependency
 *  so this module is safe to import from anywhere, including stores). */
export function getUserId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem("user_id");
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem("user_id", id);
  }
  return id;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    "X-User-Id": getUserId(),
    Accept: "application/json",
    ...(opts.headers ?? {}),
  };

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const response = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body,
    signal: opts.signal,
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    const message =
      (parsed && typeof parsed === "object" && "detail" in parsed
        ? String((parsed as { detail: unknown }).detail)
        : response.statusText) || `Request failed (${response.status})`;
    throw new ApiError(response.status, message, parsed);
  }

  return parsed as T;
}

export const apiGet = <T,>(path: string, signal?: AbortSignal) =>
  request<T>(path, { method: "GET", signal });

export const apiPost = <T,>(path: string, body?: unknown, signal?: AbortSignal) =>
  request<T>(path, { method: "POST", body, signal });

export const apiPatch = <T,>(path: string, body?: unknown, signal?: AbortSignal) =>
  request<T>(path, { method: "PATCH", body, signal });

export const apiDelete = <T,>(path: string, signal?: AbortSignal) =>
  request<T>(path, { method: "DELETE", signal });

/** Typed patch body for /v1/sessions/{id}. */
export interface SessionPatch {
  title?: string;
  mode?: ChatMode;
}

/** PATCH /v1/sessions/{id} — used by `setMode` / `renameSession` in the store. */
export const patchSession = (
  id: string,
  body: SessionPatch,
  signal?: AbortSignal,
) => apiPatch<SessionDTO>(`/v1/sessions/${id}`, body, signal);

export const apiBase = API_BASE;

/* ------------------------------------------------------------------ */
/* SSE stream consumer                                                  */
/* ------------------------------------------------------------------ */

export type ChatMode = "chat" | "reasoning";

export type StreamEvent =
  | {
      event: "meta";
      data: { session_id: string; message_id: string; mode: ChatMode };
    }
  | { event: "message"; data: { delta: string } }
  | { event: "thinking"; data: { delta: string } }
  | {
      event: "done";
      data: { finish_reason: string; thinking_complete?: boolean };
    }
  | { event: "error"; data: { message: string; type: string } };

export interface StreamChatPayload {
  session_id: string;
  content: string;
  mode: ChatMode;
}

/**
 * Connect to `/v1/chat/completions` and yield parsed SSE events.
 *
 * Throws `ApiError` if the initial response isn't 2xx. AbortSignal
 * cancels both the fetch and the response reader.
 */
export async function* streamChat(
  payload: StreamChatPayload,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const url = `${API_BASE}/v1/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-User-Id": getUserId(),
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    let detail = text;
    try {
      detail = JSON.parse(text).detail ?? text;
    } catch {
      /* keep raw text */
    }
    throw new ApiError(
      response.status,
      `Chat failed (${response.status}): ${detail}`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const ev = parseSSEFrame(raw);
      if (ev) yield ev;
    }
  }

  // Flush any trailing buffer.
  if (buffer.trim()) {
    const ev = parseSSEFrame(buffer);
    if (ev) yield ev;
  }
}

function parseSSEFrame(raw: string): StreamEvent | null {
  let eventName = "message";
  let dataLine = "";
  for (const line of raw.split("\n")) {
    if (line.startsWith(":")) continue; // comment
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLine += line.slice(6).trim();
    }
  }
  if (!dataLine) return null;
  try {
    const parsed = JSON.parse(dataLine);
    return { event: eventName, data: parsed } as StreamEvent;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Domain types (mirror backend schemas)                                */
/* ------------------------------------------------------------------ */

export interface SessionDTO {
  id: string;
  title: string;
  mode: ChatMode;
  created_at: string;
  updated_at: string;
}

export interface MessageDTO {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking: string | null;
  created_at: string;
}

export interface MessagesDTO {
  session_id: string;
  messages: MessageDTO[];
}