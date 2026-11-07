import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

// ponytail: Gemini embeddings only (free tier). Needs GOOGLE_GENERATIVE_AI_API_KEY even when chat runs on Groq.
const EMBEDDING_MODEL = google.embedding("gemini-embedding-001");
export const EMBEDDING_DIMENSIONS = 1536; // must match vector(1536) in the migration

export const RAG_LIMITS = { maxFileBytes: 10 * 1024 * 1024, maxChunks: 400, chunkChars: 1200, overlapChars: 200 };

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

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
