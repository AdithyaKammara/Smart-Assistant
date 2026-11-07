import { z } from "zod";
import type { UIMessage } from "ai";
import { LIMITS } from "./ai/config";

const textPart = z.strictObject({
  type: z.literal("text"),
  text: z.string(),
  state: z.enum(["streaming", "done"]).optional(),
});

/**
 * User messages may only contain text. File, URL and other part types are
 * rejected so a client cannot make the server fetch arbitrary URLs.
 */
const userMessage = z.looseObject({
  id: z.string().max(100),
  role: z.literal("user"),
  parts: z.array(textPart).min(1).max(LIMITS.maxPartsPerMessage),
});

/**
 * Assistant messages echo back what the server streamed earlier: text,
 * reasoning, step markers and tool calls. Anything else is rejected.
 * Note: the client can still edit this history. Phase 2 loads history from
 * Supabase instead of trusting the request.
 */
const assistantPart = z.looseObject({
  type: z
    .string()
    .refine(
      (t) => t === "text" || t === "reasoning" || t === "step-start" || t.startsWith("tool-"),
      { message: "Unsupported message part type" },
    ),
});

const assistantMessage = z.looseObject({
  id: z.string().max(100),
  role: z.literal("assistant"),
  parts: z.array(assistantPart).max(LIMITS.maxPartsPerMessage),
});

const messageSchema = z
  .discriminatedUnion("role", [userMessage, assistantMessage])
  .refine((m) => JSON.stringify(m.parts).length <= LIMITS.maxCharsPerMessage, {
    message: `Each message must be at most ${LIMITS.maxCharsPerMessage} characters`,
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
 * Validates an untrusted chat request body. Only user and assistant roles are
 * accepted: a "system" message from the browser would let anyone override the
 * system prompt.
 */
export function parseChatRequest(body: unknown): ParseResult {
  if (JSON.stringify(body ?? null).length > LIMITS.maxRequestChars) {
    return { ok: false, error: "Request is too large" };
  }
  const result = chatRequestSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? "Invalid request" };
  }
  return { ok: true, messages: result.data.messages as unknown as UIMessage[] };
}
