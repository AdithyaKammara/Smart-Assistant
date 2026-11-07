import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";
import { CHAT_MODEL, LIMITS, SYSTEM_PROMPT } from "@/lib/ai/config";
import { tools } from "@/lib/ai/tools";
import { parseChatRequest } from "@/lib/validation";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const parsed = parseChatRequest(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const result = streamText({
    model: CHAT_MODEL,
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(parsed.messages),
    tools,
    stopWhen: isStepCount(LIMITS.maxToolSteps),
    abortSignal: req.signal,
    onError: ({ error }) => {
      // Log server-side only; the client gets a generic message.
      console.error("[chat] stream error", error);
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
