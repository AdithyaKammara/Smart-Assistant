"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

/** Upload and remove PDFs; shared by the sidebar and the composer's attach button. */
export function useDocuments() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body }).catch(() => null);
      setUploading(false);
      if (!res?.ok) {
        const data = await res?.json().catch(() => null);
        setError(data?.error ?? "Upload failed.");
        return false;
      }
      router.refresh();
      return true;
    },
    [router],
  );

  const remove = useCallback(
    async (id: string) => {
      await fetch(`/api/documents?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      router.refresh();
    },
    [router],
  );

  return { upload, remove, uploading, error, clearError: () => setError(null) };
}
