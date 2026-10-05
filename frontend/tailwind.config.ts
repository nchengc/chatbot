import type { Config } from "tailwindcss";

/**
 * Token palette driven by CSS variables so dark / light themes can
 * share the same Tailwind classes (`bg-bg`, `text-fg-subtle`, …).
 *
 * The variables themselves are declared in `src/index.css`. The `.dark`
 * class on `<html>` flips the dark variant on or off.
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "hsl(var(--bg) / <alpha-value>)",
          subtle: "hsl(var(--bg-subtle) / <alpha-value>)",
          panel: "hsl(var(--bg-panel) / <alpha-value>)",
        },
        border: {
          DEFAULT: "hsl(var(--border) / <alpha-value>)",
          strong: "hsl(var(--border-strong) / <alpha-value>)",
        },
        fg: {
          DEFAULT: "hsl(var(--fg) / <alpha-value>)",
          subtle: "hsl(var(--fg-subtle) / <alpha-value>)",
          muted: "hsl(var(--fg-muted) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          hover: "hsl(var(--accent-hover) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;