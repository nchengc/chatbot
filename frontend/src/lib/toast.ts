/**
 * Tiny toast store. parse 1 keeps it dead simple: one message at a time,
 * auto-dismissed after a fixed timeout.
 *
 * parse 6 may replace this with a real queue / portal + animations.
 */
import { create } from "zustand";

interface ToastState {
  msg: string | null;
  show: (msg: string, ttlMs?: number) => void;
  dismiss: () => void;
}

export const useToastStore = create<ToastState>((set, get) => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    msg: null,
    show: (msg, ttlMs = 2000) => {
      if (timer) clearTimeout(timer);
      set({ msg });
      timer = setTimeout(() => {
        if (get().msg === msg) set({ msg: null });
        timer = null;
      }, ttlMs);
    },
    dismiss: () => {
      if (timer) clearTimeout(timer);
      timer = null;
      set({ msg: null });
    },
  };
});

/** Imperative helper for non-React code. */
export const showToast = (msg: string, ttlMs?: number) =>
  useToastStore.getState().show(msg, ttlMs);