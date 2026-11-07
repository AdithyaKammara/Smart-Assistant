"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/login/actions";
import type { ThreadSummary } from "@/lib/chat-store";

export type DocumentSummary = { id: string; name: string };

type Props = { threads: ThreadSummary[]; currentId: string; documents: DocumentSummary[]; email: string };

export function Sidebar({ threads, currentId, documents, email }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setUploadError(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/documents", { method: "POST", body }).catch(() => null);
    setUploading(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setUploadError(data?.error ?? "Upload failed.");
      return;
    }
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/documents?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <nav aria-label="Chats and documents" className="flex h-full flex-col gap-6 p-4">
      <Link href="/" className="part flex items-center justify-center">
        New chat
      </Link>

      <section className="flex min-h-0 flex-1 flex-col gap-2">
        <h2 className="text-sm font-medium text-muted">Chats</h2>
        {threads.length === 0 ? (
          <p className="text-sm text-muted">Your chats will appear here.</p>
        ) : (
          <ul className="-mx-2 flex flex-col overflow-y-auto">
            {threads.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/chat/${t.id}`}
                  aria-current={t.id === currentId ? "page" : undefined}
                  className="block truncate rounded-md px-2 py-2 text-sm text-foreground hover:bg-surface aria-[current=page]:bg-surface aria-[current=page]:font-medium"
                >
                  {t.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted">Your documents</h2>
        {documents.length === 0 && <p className="text-sm text-muted">Add a PDF and Riya can answer from it.</p>}
        <ul className="flex flex-col gap-1">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{d.name}</span>
              <button
                type="button"
                onClick={() => remove(d.id)}
                className="rounded-md px-2 py-1 text-muted hover:text-foreground"
                aria-label={`Remove ${d.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <label className={`part flex items-center justify-center ${uploading ? "pointer-events-none opacity-60" : ""}`}>
          {uploading ? "Reading the PDF…" : "Add PDF"}
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = "";
              if (file) upload(file);
            }}
          />
        </label>
        {uploadError && (
          <p role="alert" className="text-sm text-danger">
            {uploadError}
          </p>
        )}
      </section>

      <form action={signOut} className="flex items-center gap-2 border-t border-border pt-4 text-sm">
        <span className="min-w-0 flex-1 truncate text-muted">{email}</span>
        <button type="submit" className="rounded-md px-2 py-1 text-muted hover:text-foreground">
          Sign out
        </button>
      </form>
    </nav>
  );
}
