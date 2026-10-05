import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

interface InputBoxProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

/**
 * Auto-growing textarea with Enter-to-send / Shift+Enter-to-newline and a
 * stop-while-streaming affordance.
 *
 * parse 1: `onSend` feeds the mock streamer in sessionStore.
 * parse 2: `onSend` triggers a real SSE request; `onStop` aborts the fetch.
 */
export function InputBox({ onSend, onStop, isStreaming, disabled }: InputBoxProps) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow: reset height, then grow to scrollHeight (capped at 200px).
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  function handleSend(): void {
    const v = value.trim();
    if (!v || isStreaming) return;
    onSend(v);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-border bg-bg-subtle p-3">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isStreaming}
          rows={1}
          placeholder={
            disabled
              ? "parse 1 mock：当前会话已禁用"
              : isStreaming
                ? "生成中…按「停止」可中断"
                : "输入消息，Enter 发送，Shift+Enter 换行"
          }
          className={cn(
            "min-h-[44px] max-h-[200px] flex-1 resize-none rounded-xl border border-border bg-bg-panel px-3 py-2.5 text-sm leading-relaxed text-fg placeholder:text-fg-muted",
            "focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="btn bg-red-600 px-4 text-white hover:bg-red-500"
            aria-label="停止生成"
          >
            <StopIcon />
            <span>停止</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className="btn-primary px-4 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="发送消息"
          >
            <SendIcon />
            <span>发送</span>
          </button>
        )}
      </div>
      <p className="mx-auto mt-1.5 max-w-3xl text-[11px] text-fg-muted">
        parse 1 mock · 不接后端 · 仅作 UI 演示
      </p>
    </div>
  );
}

function SendIcon() {
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
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}