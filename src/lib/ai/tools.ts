import { tool } from "ai";
import { z } from "zod";

/**
 * Tools the model can call. Each runs on the server only. Start small: add
 * web search, document search (RAG) and calendar tools in later phases.
 */
export const tools = {
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
};
