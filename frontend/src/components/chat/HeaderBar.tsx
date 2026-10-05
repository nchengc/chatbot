import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import type { ChatMode } from "@/api/client";
import { useThemeStore } from "@/store/themeStore";

interface HeaderBarProps {
  mode: ChatMode;
  backendStatus: "pending" | "ok" | "error";
  statusMsg: string;
  backendBase: string;
  isStreaming: boolean;
  onModeChange: (mode: ChatMode) => void;
}

/**
 * Top header — parse 3.
 *
 * parse 2: static mode badge (对话模式 only).
 * parse 3: mutually-exclusive dropdown — 对话模式 (chat) | 推理模式
 * (reasoning) — that PATCHes the active session row via `onModeChange`.
 * The dropdown is hard-disabled while a stream is in flight to avoid a
 * race between an in-flight SSE consumer and a mode flip (see plan §6.3
 * and the "questions_for_user" list — option (b) was selected).
 */
export function HeaderBar({
  mode,
  backendStatus,
  statusMsg,
  backendBase,
  isStreaming,
  onModeChange,
}: HeaderBarProps) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-bg-subtle px-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold tracking-wide">Chatbot</span>
        <span className="text-fg-muted">·</span>
        <span className="text-fg-subtle">parse 3 · MiniMax-M3</span>
      </div>

      <div className="flex items-center gap-2">
        <ModeSelector
          mode={mode}
          disabled={isStreaming}
          onChange={onModeChange}
        />
        <BackendPill status={backendStatus} statusMsg={statusMsg} base={backendBase} />
        <button
          type="button"
          onClick={toggleTheme}
          className="btn-ghost h-9 w-9 p-0 border border-border bg-bg-panel"
          aria-label="切换主题"
          title={`切换到${theme === "dark" ? "亮色" : "暗色"}主题`}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* ModeSelector — mutually-exclusive dropdown with badge trigger        */
/* ------------------------------------------------------------------ */

interface ModeSelectorProps {
  mode: ChatMode;
  disabled: boolean;
  onChange: (mode: ChatMode) => void;
}

const OPTIONS: Array<{
  value: ChatMode;
  label: string;
  dotClass: string;
  description: string;
}> = [
  {
    value: "chat",
    label: "对话模式",
    dotClass: "bg-emerald-400",
    description: "标准对话，快速响应",
  },
  {
    value: "reasoning",
    label: "推理模式",
    dotClass: "bg-violet-400",
    description: "思考过程可见，适合复杂问题",
  },
];

function ModeSelector({ mode, disabled, onChange }: ModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Refs for keyboard arrow navigation across option buttons.
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent): void {
      const el = containerRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    }
    function onDocKey(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [open]);

  // When opening, focus the active option so arrow keys have a starting point.
  useEffect(() => {
    if (!open) return;
    const idx = OPTIONS.findIndex((o) => o.value === mode);
    const target = optionRefs.current[idx >= 0 ? idx : 0];
    target?.focus();
  }, [open, mode]);

  const current = OPTIONS.find((o) => o.value === mode) ?? OPTIONS[0];

  function handleTriggerKey(e: React.KeyboardEvent<HTMLButtonElement>): void {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function handleListKey(e: React.KeyboardEvent<HTMLDivElement>): void {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const cur = OPTIONS.findIndex((o) => o.value === mode);
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const next = (cur + dir + OPTIONS.length) % OPTIONS.length;
      optionRefs.current[next]?.focus();
    }
  }

  function pick(next: ChatMode): void {
    if (next === mode) {
      setOpen(false);
      return;
    }
    setOpen(false);
    onChange(next);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleTriggerKey}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="模型模式"
        title={disabled ? "生成中无法切换" : undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-panel px-2.5 py-1 text-xs transition-colors",
          "hover:bg-bg-subtle focus:outline-none focus:ring-2 focus:ring-accent/40",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <span className={cn("inline-block h-1.5 w-1.5 rounded-full", current.dotClass)} />
        <span className="font-medium">{current.label}</span>
        <ChevronIcon className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="模型模式"
          onKeyDown={handleListKey}
          className={cn(
            "absolute right-0 z-50 mt-1.5 w-56 overflow-hidden rounded-lg border border-border bg-bg-panel shadow-xl",
          )}
        >
          {OPTIONS.map((opt, idx) => {
            const active = opt.value === mode;
            return (
              <button
                key={opt.value}
                ref={(el) => {
                  optionRefs.current[idx] = el;
                }}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => pick(opt.value)}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition-colors",
                  "hover:bg-bg-subtle focus:bg-bg-subtle focus:outline-none",
                  active && "bg-bg-subtle",
                )}
              >
                <span className={cn("mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full", opt.dotClass)} />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium text-fg">{opt.label}</span>
                  <span className="text-fg-muted">{opt.description}</span>
                </span>
                {active && (
                  <CheckIcon className="ml-auto shrink-0 self-center text-accent" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BackendPill({
  status,
  statusMsg,
  base,
}: {
  status: "pending" | "ok" | "error";
  statusMsg: string;
  base: string;
}) {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/40 bg-emerald-900/20 px-2.5 py-1 text-[11px] text-emerald-300">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        MiniMax 已联通
        <span className="text-emerald-400/70">·</span>
        <code className="font-mono text-emerald-300/80">{shorten(base)}</code>
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-panel px-2.5 py-1 text-[11px] text-fg-subtle">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        连接后端…
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-red-700/50 bg-red-900/20 px-2.5 py-1 text-[11px] text-red-300"
      title={statusMsg}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
      后端不可达
    </span>
  );
}

function shorten(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/:\d+$/, "");
}

function SunIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
