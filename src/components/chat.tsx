"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ThreadSummary } from "@/lib/chat-store";
import { Markdown } from "./markdown";
import { Sidebar, type DocumentSummary } from "./sidebar";
import { useDictation, useSpeaker } from "./use-speech";

const SUGGESTIONS = [
  "What can you help me with?",
  "What time is it in London right now?",
  "Give me a 3-step plan to learn TypeScript",
];

type Props = {
  id: string;
  initialMessages: UIMessage[];
  threads: ThreadSummary[];
  documents: DocumentSummary[];
  email: string;
};

type SearchOutput = { results?: { n: number; document: string }[] };

/** The server answers errors as JSON ({ error }); show that text when there is one. */
function errorText(error: Error): string {
  try {
    return JSON.parse(error.message).error ?? "Something went wrong.";
  } catch {
    return "Something went wrong.";
  }
}

export function Chat({ id, initialMessages, threads, documents, email }: Props) {
  const router = useRouter();
  const [input, setInput] = useState("");
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
  const busy = status === "submitted" || status === "streaming";

  const dictation = useDictation(useCallback((text: string) => setInput(text), []));
  const speaker = useSpeaker();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    if (dictation.listening) dictation.stop();
    sendMessage({ text: trimmed });
    setInput("");
  }

  const sidebar = <Sidebar threads={threads} currentId={id} documents={documents} email={email} />;

  return (
    <div className="flex h-dvh">
      <aside className="hidden w-72 shrink-0 border-r border-border bg-surface/40 min-[60rem]:block">{sidebar}</aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
            <h1 className="font-display text-xl font-medium tracking-tight">Riya</h1>
            <p className="text-sm text-muted">Smart Assistant</p>
            <details className="relative ml-auto min-[60rem]:hidden">
              <summary className="part flex cursor-pointer list-none items-center">Menu</summary>
              <div className="panel absolute right-0 z-[var(--z-dropdown)] mt-2 h-[70dvh] w-72 overflow-y-auto">
                {sidebar}
              </div>
            </details>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" aria-live="polite">
          <div className="mx-auto w-full max-w-3xl px-4 py-8">
            {messages.length === 0 ? (
              <section className="flex min-h-[50dvh] flex-col justify-end gap-8 pb-4">
                <h2 className="max-w-[16ch] font-display text-4xl leading-[1.04] tracking-[-0.035em] text-foreground sm:text-5xl">
                  Ask anything to get started.
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button type="button" onClick={() => send(s)} className="part">
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <ol className="flex flex-col">
                {messages.map((message) =>
                  message.role === "user" ? (
                    <li key={message.id} className="flex justify-end py-4">
                      <div className="max-w-[80%] rounded-[20px] bg-surface px-4 py-2.5 text-foreground">
                        <span className="sr-only">You:</span>
                        {message.parts.map((part, i) =>
                          part.type === "text" ? (
                            <p key={i} className="whitespace-pre-wrap leading-relaxed">
                              {part.text}
                            </p>
                          ) : null,
                        )}
                      </div>
                    </li>
                  ) : (
                    <AssistantMessage
                      key={message.id}
                      message={message}
                      speaking={speaker.speakingId === message.id}
                      onSpeak={speaker.supported && !busy ? speaker.toggle : undefined}
                    />
                  ),
                )}
              </ol>
            )}

            {status === "submitted" && (
              <p className="border-t border-border py-6 text-sm text-muted">Riya is thinking…</p>
            )}
            {error && (
              <div role="alert" className="flex items-center gap-3 border-t border-border py-6 text-sm text-danger">
                {errorText(error)}
                <button type="button" onClick={() => regenerate()} className="part">
                  Retry
                </button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </main>

        <div className="mx-auto w-full max-w-3xl px-4 pb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="panel flex items-center gap-2 p-2"
          >
            <label htmlFor="chat-input" className="sr-only">
              Message
            </label>
            <input
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder={dictation.listening ? "Listening…" : "Message Riya…"}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted"
            />
            {dictation.supported && (
              <button
                type="button"
                onClick={dictation.listening ? dictation.stop : dictation.start}
                aria-pressed={dictation.listening}
                className={`part ${dictation.listening ? "part--lit" : ""}`}
              >
                {dictation.listening ? "Stop listening" : "Speak"}
              </button>
            )}
            {busy ? (
              <button type="button" onClick={() => stop()} className="part">
                Stop
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()} className="part part--lit">
                Send
              </button>
            )}
          </form>
          {dictation.error && (
            <p role="alert" className="px-3 pt-2 text-sm text-danger">
              {dictation.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  speaking,
  onSpeak,
}: {
  message: UIMessage;
  speaking: boolean;
  onSpeak?: (id: string, text: string) => void;
}) {
  const text = message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n\n");
  const sources = message.parts.flatMap((p) => {
    if (p.type !== "tool-searchDocuments" || !("output" in p)) return [];
    return (p.output as SearchOutput)?.results ?? [];
  });

  return (
    <li className="border-t border-border py-6 first:border-t-0">
      <div className="mb-3 flex items-center gap-3">
        <p className="text-sm font-medium text-muted">Riya</p>
        {onSpeak && text && (
          <button
            type="button"
            onClick={() => onSpeak(message.id, text)}
            aria-pressed={speaking}
            className="ml-auto rounded-md px-2 py-1 text-sm text-muted hover:text-foreground"
          >
            {speaking ? "Stop reading" : "Listen"}
          </button>
        )}
      </div>
      {message.parts.map((part, i) => {
        if (part.type === "text") return <Markdown key={i}>{part.text}</Markdown>;
        if (part.type === "tool-searchDocuments") {
          return (
            <p key={i} className="mb-2 text-sm text-muted">
              Searched your documents
            </p>
          );
        }
        if (part.type.startsWith("tool-")) {
          return (
            <p key={i} className="mb-2 text-sm text-muted">
              Used tool: {part.type.slice("tool-".length)}
            </p>
          );
        }
        return null;
      })}
      {sources.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-1 text-sm font-medium text-muted">Sources</p>
          <ol className="flex flex-col gap-0.5 text-sm text-muted">
            {sources.map((s) => (
              <li key={s.n}>
                [{s.n}] {s.document}
              </li>
            ))}
          </ol>
        </div>
      )}
    </li>
  );
}
