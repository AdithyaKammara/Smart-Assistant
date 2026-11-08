import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

// ponytail: Gemini embeddings only (free tier). Needs GOOGLE_GENERATIVE_AI_API_KEY even when chat runs on Groq.
const EMBEDDING_MODEL = google.embedding("gemini-embedding-001");
export const EMBEDDING_DIMENSIONS = 1536; // must match vector(1536) in the migration

export const RAG_LIMITS = {
  maxFileBytes: 10 * 1024 * 1024,
  maxPages: 300,
  extractTimeoutMs: 20_000,
  maxChunks: 400,
  chunkChars: 1200,
  overlapChars: 200,
  /** Roughly what maxChunks can hold; extraction stops here. */
  get maxTextChars() {
    return this.maxChunks * (this.chunkChars - this.overlapChars);
  },
};

/**
 * Splits text into overlapping chunks, breaking at paragraph or sentence ends
 * where possible so a chunk rarely cuts a thought in half.
 */
export function chunkText(text: string, size = RAG_LIMITS.chunkChars, overlap = RAG_LIMITS.overlapChars): string[] {
  const clean = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const window = clean.slice(start + Math.floor(size / 2), end);
      const breakAt = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "));
      if (breakAt > 0) end = start + Math.floor(size / 2) + breakAt + 1;
    }
    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

export async function embedDocuments(chunks: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: chunks,
    dimensions: EMBEDDING_DIMENSIONS,
    providerOptions: { google: { taskType: "RETRIEVAL_DOCUMENT" } },
  });
  return embeddings;
}

export async function embedQuery(query: string): Promise<number[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: query,
    dimensions: EMBEDDING_DIMENSIONS,
    providerOptions: { google: { taskType: "RETRIEVAL_QUERY" } },
  });
  return embedding;
}

export class PdfTooLargeError extends Error {}

/** Rejects if the promise has not settled by the deadline, so no single pdf.js step can stall the request. */
function beforeDeadline<T>(promise: Promise<T>, deadline: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new PdfTooLargeError("That PDF took too long to read")),
      Math.max(0, deadline - Date.now()),
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Extracts text page by page, refusing PDFs over maxPages and stopping once
 * maxTextChars is reached, so a huge PDF cannot exhaust memory or CPU.
 * Every pdf.js step races the deadline, and each text item is cut to the room
 * left in the budget before it is appended.
 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // ponytail: in-process, with deadlines that destroy the pdf.js task; a worker_thread with resourceLimits would add a hard memory cap.
  const deadline = Date.now() + RAG_LIMITS.extractTimeoutMs;
  const max = RAG_LIMITS.maxTextChars;
  const { getDocumentProxy } = await import("unpdf");
  const loading = getDocumentProxy(bytes);
  const pdf = await beforeDeadline(loading, deadline).catch((error) => {
    // Timed out while loading: destroy the document as soon as it does load.
    loading.then((late) => late.loadingTask.destroy()).catch(() => {});
    throw error;
  });

  let text = "";
  try {
    if (pdf.numPages > RAG_LIMITS.maxPages) throw new PdfTooLargeError(`PDFs can have up to ${RAG_LIMITS.maxPages} pages`);
    for (let n = 1; n <= pdf.numPages && text.length < max; n++) {
      const page = await beforeDeadline(pdf.getPage(n), deadline);
      const reader = page.streamTextContent().getReader();
      let finished = false;
      try {
        while (text.length < max) {
          const { done, value } = await beforeDeadline(reader.read(), deadline);
          if (done) {
            finished = true;
            break;
          }
          for (const item of (value as { items: { str?: string }[] }).items) {
            const room = max - text.length;
            if (room <= 0) break;
            text += `${item.str ?? ""} `.slice(0, room);
          }
        }
      } finally {
        // Stop pulling: pdf.js streams with backpressure, so unread text is not produced.
        // (reader.cancel() makes pdf.js 6 throw an unhandled "controller already closed".)
        if (!finished) reader.releaseLock();
        page.cleanup();
      }
      if (text.length < max) text += "\n\n".slice(0, max - text.length);
    }
  } finally {
    // destroy() aborts any pdf.js work still running (a timeout included) and frees the document.
    await pdf.loadingTask.destroy().catch(() => {});
  }
  return text;
}
