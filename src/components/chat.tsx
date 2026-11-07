"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "./markdown";

const SUGGESTIONS = [
  "What can you help me with?",
  "What time is it in London right now?",
  "Give me a 3-step plan to learn TypeScript",
];

export function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop, error, regenerate } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-baseline gap-3 px-4 py-4">
          <h1 className="font-display text-xl font-medium tracking-tight">Riya</h1>
          <p className="text-sm text-muted">Smart Assistant</p>
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
                  <li key={message.id} className="border-t border-border py-6 first:border-t-0">
                    <p className="mb-3 text-sm font-medium text-muted">Riya</p>
                    {message.parts.map((part, i) => {
                      if (part.type === "text") return <Markdown key={i}>{part.text}</Markdown>;
                      if (part.type.startsWith("tool-")) {
                        return (
                          <p key={i} className="mb-2 text-sm text-muted">
                            Used tool: {part.type.slice("tool-".length)}
                          </p>
                        );
                      }
                      return null;
                    })}
                  </li>
                ),
              )}
            </ol>
          )}

          {status === "submitted" && (
            <p className="border-t border-border py-6 text-sm text-muted">Riya is thinking…</p>
          )}
          {error && (
            <div role="alert" className="flex items-center gap-3 border-t border-border py-6 text-sm text-danger">
              Something went wrong.
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
            placeholder="Message Riya…"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted"
          />
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
      </div>
    </div>
  );
}
