import { z } from "zod";
import type { UIMessage } from "ai";
import { LIMITS } from "./ai/config";

const partSchema = z
  .looseObject({ type: z.string() })
  .refine(
    (part) =>
      part.type !== "text" ||
      (typeof part.text === "string" && part.text.length <= LIMITS.maxCharsPerMessage),
    { message: `Each message must be at most ${LIMITS.maxCharsPerMessage} characters` },
  );

const messageSchema = z.looseObject({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  parts: z.array(partSchema),
});

export const chatRequestSchema = z.object({
  messages: z
    .array(messageSchema)
    .min(1, "At least one message is required")
    .max(LIMITS.maxMessages, `At most ${LIMITS.maxMessages} messages per request`),
});

export type ParseResult =
  | { ok: true; messages: UIMessage[] }
  | { ok: false; error: string };

/**
 * Validates an untrusted chat request body. Clients may only send user and
 * assistant messages: a "system" role from the browser would let anyone
 * override the system prompt, so it is rejected.
 */
export function parseChatRequest(body: unknown): ParseResult {
  const result = chatRequestSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? "Invalid request" };
  }
  return { ok: true, messages: result.data.messages as unknown as UIMessage[] };
}
