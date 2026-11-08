import { tool } from "ai";
import { z } from "zod";
import { embedQuery } from "../rag";
import type { Supabase } from "../supabase/server";

/** Tools run on the server, with a Supabase client acting as the signed-in user. */
export function createTools(supabase: Supabase) {
  return {
    getCurrentTime: tool({
      description: "Get the current date and time in a given IANA time zone.",
      inputSchema: z.object({
        timeZone: z
          .string()
          .describe('IANA time zone such as "Asia/Kolkata" or "Europe/London"')
          .default("UTC"),
      }),
      execute: async ({ timeZone }) => {
        try {
          const formatted = new Intl.DateTimeFormat("en-GB", {
            dateStyle: "full",
            timeStyle: "long",
            timeZone,
          }).format(new Date());
          return { timeZone, formatted };
        } catch {
          return { error: `Unknown time zone: ${timeZone}` };
        }
      },
    }),

    searchDocuments: tool({
      description:
        "Search the PDFs the user has uploaded. Use it whenever the question could be answered from their documents. Cite results as [1], [2] by their number.",
      inputSchema: z.object({ query: z.string().min(1).describe("What to look for, in plain words") }),
      execute: async ({ query }) => {
        const { data, error } = await supabase.rpc("match_document_chunks", {
          query_embedding: JSON.stringify(await embedQuery(query)),
          match_count: 5,
        });
        if (error) return { error: "Document search failed" };
        const results = (data ?? []) as { document_name: string; content: string; similarity: number }[];
        if (results.length === 0) return { results: [], note: "The user has no matching documents." };
        return {
          results: results.map((r, i) => ({
            n: i + 1,
            document: r.document_name,
            excerpt: r.content,
            similarity: Number(r.similarity.toFixed(3)),
          })),
        };
      },
    }),
  };
}
