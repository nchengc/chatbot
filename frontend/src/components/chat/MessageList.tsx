import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import type { ChatMode } from "@/api/client";
import type { Message } from "@/store/sessionStore";

import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  /** Active session mode — passed through to MessageBubble so ThinkingBlock is gated on reasoning mode. */
  mode?: ChatMode;
}

export function MessageList({ messages, isStreaming, mode }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new content / streaming updates.
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, messages.at(-1)?.content, messages.at(-1)?.thinking, isStreaming]);

  if (messages.length === 0) {
    return <WelcomeScreen />;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} mode={mode} />
        ))}
        <div ref={endRef} className="h-px shrink-0" />
      </div>
    </div>
  );
}

function WelcomeScreen() {
  const tips: Array<{ tag: string; text: string }> = [
    { tag: "💭", text: "折叠式思考块：默认收起，点击展开" },
    { tag: "📋", text: "代码块：右上角「复制」一键带走" },
    { tag: "⌨️", text: "Enter 发送，Shift+Enter 换行" },
    { tag: "🛑", text: "生成中可点「停止」中断" },
  ];

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-bg-panel p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-2xl">
          💬
        </div>
        <h1 className="mb-2 text-xl font-semibold">Parse 1 · Mock UI</h1>
        <p className="mb-5 text-sm text-fg-subtle">
          纯前端模拟，<span className="text-fg">不接后端</span>。
          试试发 <code className="rounded bg-bg-subtle px-1">写个 Python 快速排序</code> 看完整效果。
        </p>
        <ul className="grid grid-cols-1 gap-1.5 text-left text-xs text-fg-subtle sm:grid-cols-2">
          {tips.map((t) => (
            <li
              key={t.tag}
              className={cn(
                "flex items-start gap-2 rounded-lg border border-border bg-bg-subtle px-3 py-2",
              )}
            >
              <span className="text-base">{t.tag}</span>
              <span>{t.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}