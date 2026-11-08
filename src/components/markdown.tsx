"use client";

import { Check, Code2, Copy } from "lucide-react";
import { isValidElement, memo, useState, type ReactElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** Plain text of a React tree (code blocks arrive as nested spans and strings). */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const code = isValidElement(children) ? (children as ReactElement<{ className?: string; children?: ReactNode }>) : null;
  const language = code?.props.className?.match(/language-([\w+-]+)/)?.[1] ?? "text";
  const text = textOf(code?.props.children ?? children).replace(/\n$/, "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure origin or denied); nothing else to do.
    }
  }

  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl bg-sidebar shadow-md">
      <div className="flex items-center justify-between bg-surface-high px-4 py-2">
        <span className="flex items-center gap-1.5 font-mono text-xs text-foreground">
          <Code2 className="size-4 text-tertiary" aria-hidden />
          {language}
        </span>
        <button type="button" onClick={copy} className="ghost bg-surface px-2.5 py-1">
          {copied ? <Check className="size-3.5 text-accent-bright" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          <span aria-live="polite">{copied ? "Copied" : "Copy code"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-foreground">
        <code>{text}</code>
      </pre>
    </div>
  );
}

/**
 * Renders model output as markdown (GitHub flavour: tables, task lists,
 * strikethrough). react-markdown ignores raw HTML by default, so model output
 * cannot inject scripts or markup into the page.
 */
const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
};

export const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <div className="reply prose max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
});
