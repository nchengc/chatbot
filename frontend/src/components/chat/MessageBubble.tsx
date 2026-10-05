import { cn } from "@/lib/cn";
import type { ChatMode } from "@/api/client";
import type { Message } from "@/store/sessionStore";

import { Markdown } from "./Markdown";
import { ThinkingBlock } from "./ThinkingBlock";

interface MessageBubbleProps {
  message: Message;
  /**
   * Active session mode (parse 3). When 'reasoning', the ThinkingBlock is
   * allowed to surface. When 'chat', it is suppressed entirely as defence
   * in depth — a stray `thinking` SSE chunk in chat mode never leaks into
   * the panel.
   */
  mode?: ChatMode;
}

/**
 * Renders one chat message.
 *
 * User messages: right-aligned, accent color.
 * Assistant messages: left-aligned, panel color, optional ThinkingBlock
 * pinned to the top when the session is in reasoning mode (collapsed by
 * default — plan §6.4).
 */
export function MessageBubble({ message, mode }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const showCursor =
    message.isStreaming &&
    (message.thinking.length === 0 ? !message.content : true) &&
    message.content.length === 0;
  const showThinking = !isUser && mode === "reasoning";

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm sm:max-w-[75%]",
          isUser
            ? "rounded-br-md bg-accent text-white"
            : "rounded-bl-md border border-border bg-bg-panel text-fg",
        )}
      >
        {showThinking && (
          <ThinkingBlock
            content={message.thinking}
            isStreaming={message.isStreaming}
          />
        )}

        {message.content ? (
          <Markdown content={message.content} />
        ) : showCursor ? (
          <span className="inline-block h-4 w-1.5 animate-pulse bg-fg-subtle align-middle" />
        ) : null}

        {message.isStreaming && message.content.length > 0 && !isUser && (
          <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-fg-subtle align-baseline" />
        )}
      </div>
    </div>
  );
}