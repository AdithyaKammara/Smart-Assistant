"use client";

import { FileText, LogOut, MessageSquare, Plus, Search, Sparkles, Upload, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { signOut } from "@/app/login/actions";
import type { ThreadSummary } from "@/lib/chat-store";
import { groupThreads } from "@/lib/thread-groups";
import { useDocuments } from "./use-documents";

export type DocumentSummary = { id: string; name: string };

type Props = {
  threads: ThreadSummary[];
  currentId: string;
  documents: DocumentSummary[];
  email: string;
  onNavigate?: () => void;
};

export function Sidebar({ threads, currentId, documents, email, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const docs = useDocuments();

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groupThreads(q ? threads.filter((t) => t.title.toLowerCase().includes(q)) : threads);
  }, [threads, query]);

  return (
    <nav aria-label="Chats and documents" className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 shrink-0 items-center gap-2 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-surface-high text-accent-bright">
          <Sparkles className="size-[18px]" aria-hidden />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-sm font-semibold leading-none tracking-tight text-foreground">Riya</span>
          <span className="mt-1 text-xs leading-none text-secondary-tone">Smart Assistant</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-2">
        <Link href="/" onClick={onNavigate} className="part part--lit h-10 w-full justify-start font-semibold">
          <Plus className="size-[18px]" aria-hidden />
          New chat
        </Link>
        <label className="flex items-center gap-2 rounded-lg bg-surface-low px-2.5 py-2 text-muted focus-within:text-foreground">
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">Search chats</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Search chats"
            className="w-full bg-transparent text-[13px] text-foreground placeholder:text-muted focus:outline-none"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-2">
        <section className="flex flex-col gap-1">
          <h2 className="px-2 text-xs font-medium text-muted">Your documents</h2>
          {documents.length === 0 && (
            <p className="px-2 text-[13px] text-muted">Add a PDF and Riya can answer from it.</p>
          )}
          <ul className="flex flex-col gap-0.5">
            {documents.map((d) => (
              <li key={d.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-ink-2 hover:bg-surface-high">
                <FileText className="size-4 shrink-0 text-tertiary" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{d.name}</span>
                <button
                  type="button"
                  onClick={() => docs.remove(d.id)}
                  aria-label={`Remove ${d.name}`}
                  className="rounded p-0.5 text-muted opacity-60 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-ink-2 hover:bg-surface-high hover:text-foreground focus-within:outline-2 focus-within:outline-[var(--color-focus)] ${docs.uploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <Upload className="size-4 shrink-0 text-secondary-tone" aria-hidden />
            {docs.uploading ? "Reading the PDF…" : "Add PDF"}
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
          {docs.error && (
            <p role="alert" className="px-2 text-[13px] text-danger">
              {docs.error}
            </p>
          )}
        </section>

        {groups.length === 0 ? (
          <p className="px-2 text-[13px] text-muted">{query ? "No chats match your search." : "Your chats will appear here."}</p>
        ) : (
          groups.map((group) => (
            <section key={group.label} className="flex flex-col gap-1">
              <h2 className="px-2 text-xs font-medium text-muted">{group.label}</h2>
              <ul className="flex flex-col gap-0.5">
                {group.threads.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/chat/${t.id}`}
                      onClick={onNavigate}
                      aria-current={t.id === currentId ? "page" : undefined}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-ink-2 hover:bg-surface-high hover:text-foreground aria-[current=page]:bg-surface aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
                    >
                      <MessageSquare className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{t.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <form action={signOut} className="flex shrink-0 items-center gap-2 bg-surface-low p-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-bright font-display text-sm font-semibold uppercase text-accent-foreground">
          {email.slice(0, 1) || "?"}
        </div>
        <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">{email}</span>
        <button type="submit" aria-label="Sign out" title="Sign out" className="ghost px-2">
          <LogOut className="size-4" aria-hidden />
        </button>
      </form>
    </nav>
  );
}
