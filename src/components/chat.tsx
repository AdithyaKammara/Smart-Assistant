"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";

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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col px-4">
      <header className="flex items-center justify-between border-b border-border py-4">
        <div>
          <h1 className="text-lg font-semibold">Riya</h1>
          <p className="text-sm text-muted">Smart Assistant</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto py-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <p className="text-muted">Ask anything to get started.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-4 py-2 text-sm hover:bg-surface"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {messages.map((message) => (
              <li
                key={message.id}
                className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] rounded-2xl bg-accent px-4 py-2 text-accent-foreground"
                      : "max-w-[85%] rounded-2xl bg-surface px-4 py-2"
                  }
                >
                  <span className="sr-only">{message.role === "user" ? "You:" : "Riya:"}</span>
                  {message.parts.map((part, i) => {
                    const key = `${message.id}-${i}`;
                    if (part.type === "text") {
                      return (
                        <p key={key} className="whitespace-pre-wrap leading-relaxed">
                          {part.text}
                        </p>
                      );
                    }
                    if (part.type.startsWith("tool-")) {
                      return (
                        <p key={key} className="text-xs text-muted">
                          Used tool: {part.type.slice("tool-".length)}
                        </p>
                      );
                    }
                    return null;
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
        {status === "submitted" && <p className="mt-4 text-sm text-muted">Riya is thinking…</p>}
        {error && (
          <div role="alert" className="mt-4 flex items-center gap-3 text-sm text-danger">
            Something went wrong.
            <button type="button" onClick={() => regenerate()} className="underline">
              Retry
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-border py-4"
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
          className="flex-1 rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
        />
        {busy ? (
          <button
            type="button"
            onClick={() => stop()}
            className="rounded-xl border border-border px-5 font-medium"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-xl bg-accent px-5 font-medium text-accent-foreground disabled:opacity-40"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
