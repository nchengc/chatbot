import { useState } from "react";

import { cn } from "@/lib/cn";

interface ThinkingBlockProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * Collapsible "thinking process" panel.
 *
 * - Default collapsed (matches plan §6.4 折叠式约定).
 * - Click header to expand / collapse.
 * - While the assistant is still in the thinking phase (no content yet)
 *   the header pulses "思考中…".
 * - Renders nothing if there is no thinking content and not actively
 *   streaming, so we don't mount an empty panel.
 */
export function ThinkingBlock({ content, isStreaming }: ThinkingBlockProps) {
  const [open, setOpen] = useState(false);

  if (!content && !isStreaming) return null;

  const showStreamingHint = isStreaming === true && content.length === 0;

  return (
    <div className="mb-2 overflow-hidden rounded-lg border border-border bg-bg-subtle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs text-fg-subtle transition-colors hover:bg-bg-panel hover:text-fg"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          <BrainIcon />
          <span className="font-medium">思考过程</span>
          {showStreamingHint && (
            <span className="text-fg-muted animate-pulse">思考中…</span>
          )}
          {!showStreamingHint && content.length > 0 && (
            <span className="text-fg-muted">({content.length})</span>
          )}
        </span>
        <ChevronIcon className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-t border-border bg-bg-subtle px-3 py-2 font-mono text-[12px] leading-relaxed text-fg-subtle">
          {content}
          {isStreaming && content.length > 0 && (
            <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-fg-subtle align-baseline" />
          )}
        </pre>
      )}
    </div>
  );
}

function BrainIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5a3 3 0 1 0-5.997.142 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.142 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M6.401 17.5a3 3 0 0 0 1.374.399" />
      <path d="M17.599 17.5a3 3 0 0 1-.399 1.375" />
      <path d="M20.523 13.104a4 4 0 0 0-.585-.396" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      width="13"
      height="13"
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