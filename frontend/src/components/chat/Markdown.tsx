import { useEffect, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js/lib/core";

import { cn } from "@/lib/cn";

/* Languages we want to support out of the box. Parse 6 may extend. */
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";

import "highlight.js/styles/github-dark.css";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("css", css);
hljs.registerLanguage("go", go);
hljs.registerLanguage("java", java);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("python", python);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);

const KNOWN_LANGS = new Set([
  "bash",
  "css",
  "go",
  "html",  // alias for xml
  "java",
  "javascript",
  "js",
  "json",
  "markdown",
  "md",
  "python",
  "py",
  "rust",
  "sql",
  "tsx",
  "typescript",
  "ts",
  "xml",
]);

interface MarkdownProps {
  content: string;
}

/**
 * Markdown renderer.
 *
 * Uses `react-markdown` + `remark-gfm` (tables / task lists / strikethrough).
 *
 * Code blocks are highlighted ourselves with `highlight.js` rather than
 * `rehype-highlight` so we control the HTML output and preserve
 * newlines correctly (rehype-highlight wraps tokens in `<span>`s and
 * loses the line breaks when the text is concatenated).
 */
export function Markdown({ content }: MarkdownProps) {
  const components: Components = {
    code(props) {
      const { children, className } = props;
      const match = /language-(\w+)/.exec(className ?? "");
      const text = stringify(children);
      const isBlock = Boolean(match) && text.includes("\n");
      if (!isBlock) {
        return (
          <code
            className={cn(
              "rounded bg-bg-subtle px-1 py-0.5 font-mono text-[0.9em] text-fg",
              className,
            )}
          >
            {children}
          </code>
        );
      }
      const rawLang = match?.[1]?.toLowerCase() ?? "text";
      const lang = normalizeLang(rawLang);
      return <CodeBlock language={lang} code={text.replace(/\n$/, "")} />;
    },
    pre({ children }) {
      // We render our own <pre> inside CodeBlock.
      return <>{children}</>;
    },
    a({ children, href }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-2 hover:text-accent-hover"
        >
          {children}
        </a>
      );
    },
    table({ children }) {
      return (
        <div className="my-2 overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">{children}</table>
        </div>
      );
    },
    th({ children }) {
      return (
        <th className="border-b border-border bg-bg-subtle px-3 py-1.5 font-medium text-fg-subtle">
          {children}
        </th>
      );
    },
    td({ children }) {
      return <td className="border-b border-border px-3 py-1.5">{children}</td>;
    },
    blockquote({ children }) {
      return (
        <blockquote className="my-2 border-l-2 border-accent pl-3 italic text-fg-subtle">
          {children}
        </blockquote>
      );
    },
    ul({ children }) {
      return <ul className="my-1.5 ml-5 list-disc space-y-0.5">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="my-1.5 ml-5 list-decimal space-y-0.5">{children}</ol>;
    },
    h1({ children }) {
      return <h1 className="mb-1 mt-2 text-base font-semibold">{children}</h1>;
    },
    h2({ children }) {
      return <h2 className="mb-1 mt-2 text-sm font-semibold">{children}</h2>;
    },
    h3({ children }) {
      return <h3 className="mb-1 mt-2 text-sm font-medium">{children}</h3>;
    },
    p({ children }) {
      return <p className="my-1 leading-relaxed">{children}</p>;
    },
  };

  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* helpers                                                              */
/* ------------------------------------------------------------------ */

function stringify(input: unknown): string {
  if (input === null || input === undefined || input === false) return "";
  if (typeof input === "string") return input;
  if (typeof input === "number") return String(input);
  if (Array.isArray(input)) return input.map(stringify).join("");
  if (typeof input === "object") {
    // React element with a `children` prop — recurse.
    const c = (input as { children?: unknown }).children;
    if (c !== undefined) return stringify(c);
  }
  return "";
}

function normalizeLang(lang: string): string {
  const lower = lang.toLowerCase();
  if (lower === "py") return "python";
  if (lower === "js") return "javascript";
  if (lower === "ts" || lower === "tsx") return "typescript";
  if (lower === "md") return "markdown";
  if (lower === "html") return "xml";
  if (KNOWN_LANGS.has(lower)) return lower;
  return "text";
}

/* ------------------------------------------------------------------ */
/* CodeBlock                                                            */
/* ------------------------------------------------------------------ */

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo<string>(() => {
    try {
      if (language !== "text" && hljs.getLanguage(language)) {
        return hljs.highlight(code, {
          language,
          ignoreIllegals: true,
        }).value;
      }
      return escapeHtml(code);
    } catch {
      return escapeHtml(code);
    }
  }, [code, language]);

  // Reset copy state if the code content changes mid-stream so the
  // "已复制" pill doesn't linger from a previous block.
  useEffect(() => {
    setCopied(false);
  }, [code]);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-border bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-[#30363d] bg-[#161b22] px-3 py-1">
        <span className="font-mono text-[11px] uppercase tracking-wide text-fg-muted">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-fg-subtle transition-colors hover:bg-bg-subtle hover:text-fg"
          aria-label="复制代码"
        >
          {copied ? <CopyOkIcon /> : <CopyIcon />}
          <span>{copied ? "已复制" : "复制"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[12.5px] leading-relaxed">
        <code
          className={`hljs language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function CopyIcon() {
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
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CopyOkIcon() {
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
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}