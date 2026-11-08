"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowUp,
  Check,
  Clock,
  Copy,
  FileSearch,
  ListChecks,
  Menu,
  Mic,
  MicOff,
  Paperclip,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { hasContent, type ThreadSummary } from "@/lib/chat-store";
import { Markdown } from "./markdown";
import { Sidebar, type DocumentSummary } from "./sidebar";
import { useDocuments } from "./use-documents";
import { useDictation, useSpeaker } from "./use-speech";

const SUGGESTIONS: { text: string; icon: ReactNode }[] = [
  { text: "What can you help me with?", icon: <Sparkles className="size-4" aria-hidden /> },
  { text: "What time is it in London right now?", icon: <Clock className="size-4" aria-hidden /> },
  { text: "Give me a 3-step plan to learn TypeScript", icon: <ListChecks className="size-4" aria-hidden /> },
];

type Props = {
  id: string;
  initialMessages: UIMessage[];
  threads: ThreadSummary[];
  documents: DocumentSummary[];
  email: string;
  model: string;
};

type SearchOutput = { results?: { n: number; document: string }[] };

/** The server answers errors as JSON ({ error }); show that text when there is one. */
function errorText(error: Error): string {
  try {
    return JSON.parse(error.message).error ?? "Something went wrong.";
  } catch {
    return error.message && error.message.length < 160 ? error.message : "Something went wrong.";
  }
}

export function Chat({ id, initialMessages, threads, documents, email, model }: Props) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // Only the new message travels; the server loads the rest from the database.
      prepareSendMessagesRequest: ({ messages, id }) => ({ body: { id, message: messages.at(-1) } }),
    }),
    onFinish: () => router.refresh(), // picks up the new thread title in the sidebar
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const title = threads.find((t) => t.id === id)?.title ?? "New chat";

  const dictation = useDictation(useCallback((text: string) => setInput(text), []));
  const speaker = useSpeaker();
  const docs = useDocuments();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  // Grow the composer with its text, up to about six lines.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [input]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    if (dictation.listening) dictation.stop();
    sendMessage({ text: trimmed });
    setInput("");
  }

  const lastAssistantId = messages.findLast((m) => m.role === "assistant")?.id;
  const sidebarProps = { threads, currentId: id, documents, email };

  return (
    <div className="flex h-dvh bg-background">
      <aside className="hidden w-72 shrink-0 min-[60rem]:block">
        <Sidebar {...sidebarProps} />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex min-[60rem]:hidden" role="dialog" aria-modal="true" aria-label="Chats and documents">
          <div className="w-72 max-w-[85vw] shadow-2xl">
            <Sidebar {...sidebarProps} onNavigate={() => setMenuOpen(false)} />
          </div>
          <button
            type="button"
            aria-label="Close menu"
            className="flex-1 bg-black/60"
            onClick={() => setMenuOpen(false)}
          />
        </div>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 bg-sidebar/80 px-4 shadow-[var(--shadow-bar)] backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="ghost -ml-2 px-2 min-[60rem]:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <h1 className="min-w-0 truncate font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {title}
          </h1>
          <div className="hidden h-4 w-px bg-surface-highest sm:block" />
          <p className="hidden items-center gap-1.5 rounded-full bg-surface-low px-2.5 py-1 text-xs font-medium text-foreground shadow-[var(--ring-hair)] sm:flex">
            <span className="sr-only">Model:</span>
            {model}
          </p>
        </header>

        <main className="flex-1 overflow-y-auto" aria-live="polite">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 pb-48 pt-8 sm:px-6">
            {messages.length === 0 ? (
              <section className="flex min-h-[45dvh] flex-col justify-end gap-6">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-soft text-accent-foreground shadow-lg shadow-black/30">
                  <Sparkles className="size-6" aria-hidden />
                </div>
                <h2 className="max-w-[18ch] font-display text-3xl font-semibold leading-tight tracking-[-0.025em] text-foreground sm:text-4xl">
                  Ask anything to get started.
                </h2>
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted">Try one of these</p>
                  <ul className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <li key={s.text}>
                        <button
                          type="button"
                          onClick={() => send(s.text)}
                          className="group flex items-center gap-1.5 rounded-lg bg-surface-low px-3 py-2 text-[13px] text-foreground shadow-sm transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-surface"
                        >
                          <span className="text-secondary-tone group-hover:text-accent-bright">{s.icon}</span>
                          {s.text}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : (
              messages.filter((m) => m.role === "user" || hasContent(m) || m.id === messages.at(-1)?.id).map((message) =>
                message.role === "user" ? (
                  <article key={message.id} className="flex w-full flex-col items-end gap-1.5 self-end">
                    <span className="pr-1 text-[13px] font-semibold text-foreground">You</span>
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-surface-high p-4 text-foreground shadow-md">
                      {message.parts.map((part, i) =>
                        part.type === "text" ? (
                          <p key={i} className="whitespace-pre-wrap text-[15px] leading-relaxed">
                            {part.text}
                          </p>
                        ) : null,
                      )}
                    </div>
                  </article>
                ) : (
                  <AssistantMessage
                    key={message.id}
                    message={message}
                    model={model}
                    speaking={speaker.speakingId === message.id}
                    onSpeak={speaker.supported && !busy ? speaker.toggle : undefined}
                    onRegenerate={!busy && message.id === lastAssistantId ? () => regenerate() : undefined}
                  />
                ),
              )
            )}

            {status === "submitted" && (
              <div className="flex items-center gap-3 text-[13px] text-muted">
                <Avatar />
                Riya is thinking…
              </div>
            )}
            {error && (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-low p-4 text-[13px] text-danger">
                {errorText(error)}
                <button type="button" onClick={() => regenerate()} className="part">
                  <RefreshCw className="size-3.5" aria-hidden />
                  Retry
                </button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </main>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center bg-gradient-to-t from-background via-background/90 to-transparent px-4 pb-4 pt-10 sm:px-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="panel pointer-events-auto flex w-full max-w-3xl flex-col gap-1 p-2"
          >
            <label htmlFor="chat-input" className="sr-only">
              Message
            </label>
            <textarea
              id="chat-input"
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={dictation.listening ? "Listening…" : "Message Riya…"}
              className="max-h-[168px] w-full resize-none bg-transparent px-2 py-2 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <label
                  title="Attach a PDF"
                  className={`ghost cursor-pointer p-2 focus-within:outline-2 focus-within:outline-[var(--color-focus)] ${docs.uploading ? "pointer-events-none opacity-60" : ""}`}
                >
                  <Paperclip className="size-5" aria-hidden />
                  <span className="sr-only">Attach a PDF</span>
                  {docs.uploading && <span className="text-xs">Reading…</span>}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    disabled={docs.uploading}
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0];
                      e.currentTarget.value = "";
                      if (file) docs.upload(file);
                    }}
                  />
                </label>
                {dictation.supported && (
                  <button
                    type="button"
                    onClick={dictation.listening ? dictation.stop : dictation.start}
                    aria-pressed={dictation.listening}
                    aria-label={dictation.listening ? "Stop listening" : "Speak"}
                    title={dictation.listening ? "Stop listening" : "Speak"}
                    className="ghost p-2"
                  >
                    {dictation.listening ? <MicOff className="size-5" aria-hidden /> : <Mic className="size-5" aria-hidden />}
                  </button>
                )}
              </div>
              {busy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  aria-label="Stop"
                  title="Stop"
                  className="flex size-10 items-center justify-center rounded-xl bg-surface-high text-foreground transition-colors hover:bg-surface-highest active:scale-95"
                >
                  <Square className="size-4 fill-current" aria-hidden />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send"
                  title="Send"
                  className="group flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-lg shadow-accent/30 transition-[background-color,transform] hover:bg-accent-bright active:scale-95 disabled:opacity-40 disabled:shadow-none"
                >
                  <ArrowUp className="size-5 transition-transform group-hover:-translate-y-0.5" aria-hidden />
                </button>
              )}
            </div>
          </form>
          {(dictation.error || docs.error) && (
            <p role="alert" className="pointer-events-auto mt-2 text-[13px] text-danger">
              {dictation.error ?? docs.error}
            </p>
          )}
          <p className="pointer-events-auto mt-2 text-center text-xs text-muted">
            Riya can make mistakes. Check important information.
          </p>
        </div>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-soft text-accent-foreground shadow-lg shadow-black/30">
      <Sparkles className="size-5" aria-hidden />
    </div>
  );
}

function ToolChip({ type }: { type: string }) {
  const name = type.slice("tool-".length);
  const label = name === "searchDocuments" ? "Searched your documents" : name === "getCurrentTime" ? "Checked the time" : `Used ${name}`;
  const icon =
    name === "searchDocuments" ? <FileSearch className="size-3.5 text-secondary-tone" aria-hidden /> : name === "getCurrentTime" ? <Clock className="size-3.5 text-secondary-tone" aria-hidden /> : <Wrench className="size-3.5 text-secondary-tone" aria-hidden />;
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-low px-2.5 py-1 text-xs text-ink-2">
      {icon}
      {label}
    </span>
  );
}

function AssistantMessage({
  message,
  model,
  speaking,
  onSpeak,
  onRegenerate,
}: {
  message: UIMessage;
  model: string;
  speaking: boolean;
  onSpeak?: (id: string, text: string) => void;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n\n");
  const sources = message.parts.flatMap((p) => {
    if (p.type !== "tool-searchDocuments" || !("output" in p)) return [];
    return (p.output as SearchOutput)?.results ?? [];
  });
  const tools = [...new Set(message.parts.filter((p) => p.type.startsWith("tool-")).map((p) => p.type))];

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; nothing else to do.
    }
  }

  return (
    <article className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar />
        <div className="flex flex-col">
          <span className="font-display text-sm font-semibold text-foreground">Riya</span>
          <span className="text-xs text-muted">{model}</span>
        </div>
      </div>

      {tools.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tools.map((t) => (
            <ToolChip key={t} type={t} />
          ))}
        </div>
      )}

      {message.parts.map((part, i) => (part.type === "text" ? <Markdown key={i}>{part.text}</Markdown> : null))}

      {sources.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Sources">
          {sources.map((s) => (
            <li key={s.n} className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-2.5 py-1 text-xs text-ink-2">
              <ShieldCheck className="size-3.5 text-secondary-tone" aria-hidden />
              [{s.n}] {s.document}
            </li>
          ))}
        </ul>
      )}

      {text && (
        <footer className="-ml-2.5 flex flex-wrap items-center gap-1">
          <button type="button" onClick={copy} className="ghost">
            {copied ? <Check className="size-4 text-accent-bright" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
          </button>
          {onRegenerate && (
            <button type="button" onClick={onRegenerate} className="ghost">
              <RefreshCw className="size-4" aria-hidden />
              Regenerate
            </button>
          )}
          {onSpeak && (
            <button type="button" onClick={() => onSpeak(message.id, text)} aria-pressed={speaking} className="ghost">
              {speaking ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
              {speaking ? "Stop reading" : "Listen"}
            </button>
          )}
        </footer>
      )}
    </article>
  );
}

