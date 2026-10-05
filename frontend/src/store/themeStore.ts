/**
 * Theme store — toggles between dark and light, persists to
 * localStorage and applies the `dark` class to <html>.
 */
import { create } from "zustand";

export type Theme = "dark" | "light";

const STORAGE_KEY = "chatbot_theme";

function readPersisted(): Theme {
  if (typeof window === "undefined") return "dark";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" ? v : "dark";
}

function apply(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function persist(theme: Theme): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const initial: Theme = readPersisted();
// Apply once so the first paint matches the persisted theme (avoid flash).
apply(initial);

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial,
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    apply(next);
    persist(next);
    set({ theme: next });
  },
  setTheme: (t) => {
    apply(t);
    persist(t);
    set({ theme: t });
  },
}));