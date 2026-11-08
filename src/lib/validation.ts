import { z } from "zod";
import type { UIMessage } from "ai";
import { LIMITS } from "./ai/config";

const textPart = z.strictObject({
  type: z.literal("text"),
  text: z.string(),
  state: z.enum(["streaming", "done"]).optional(),
});

/**
 * The browser sends only the new user message; earlier messages are loaded
 * from the database, so the client cannot rewrite the conversation history.
 * User messages may only contain text, so a client cannot make the server
 * fetch arbitrary URLs through file parts.
 */
const userMessage = z
  .looseObject({
    id: z.string().min(1).max(100),
    role: z.literal("user"),
    parts: z.array(textPart).min(1).max(LIMITS.maxPartsPerMessage),
  })
  .refine((m) => m.parts.reduce((n, p) => n + p.text.length, 0) <= LIMITS.maxCharsPerMessage, {
    message: `Each message must be at most ${LIMITS.maxCharsPerMessage} characters`,
  })
  .refine((m) => m.parts.some((p) => p.text.trim().length > 0), { message: "Message is empty" });

export const chatRequestSchema = z.object({
  id: z.uuid("Chat id must be a UUID"),
  message: userMessage,
});

export type ParseResult =
  | { ok: true; id: string; message: UIMessage }
  | { ok: false; error: string };

export function parseChatRequest(body: unknown): ParseResult {
  if (JSON.stringify(body ?? null).length > LIMITS.maxRequestChars) {
    return { ok: false, error: "Request is too large" };
  }
  const result = chatRequestSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? "Invalid request" };
  }
  return { ok: true, id: result.data.id, message: result.data.message as unknown as UIMessage };
}
