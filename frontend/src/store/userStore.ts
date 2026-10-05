import { create } from "zustand";

/**
 * Anonymous user store.
 *
 * parse 0: the browser generates a UUID on first load and persists it to
 * localStorage. Every API request sends it as `X-User-Id` so the backend
 * can scope data without an actual login.
 *
 * parse 8 (account system) replaces this with a JWT-bound identity.
 */

function readOrCreateUserId(): string {
  if (typeof window === "undefined") return "";
  const key = "user_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const fresh =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : fallbackUuid();
  window.localStorage.setItem(key, fresh);
  return fresh;
}

function fallbackUuid(): string {
  // Tiny RFC4122 v4 fallback for very old browsers.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface UserState {
  userId: string;
}

export const useUserStore = create<UserState>(() => ({
  userId: readOrCreateUserId(),
}));

/** Imperative accessor for non-React code (e.g. fetch wrappers). */
export const getUserId = (): string => useUserStore.getState().userId;