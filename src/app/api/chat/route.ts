import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai";
import { LIMITS, SYSTEM_PROMPT } from "@/lib/ai/config";
import { getChatModel } from "@/lib/ai/model";
import { createTools } from "@/lib/ai/tools";
import { consumeChatQuota, loadMessages, saveChat } from "@/lib/chat-store";
import { createClient } from "@/lib/supabase/server";
import { parseChatRequest } from "@/lib/validation";

export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = parseChatRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  if (!(await consumeChatQuota(supabase, LIMITS.messagesPerHour))) {
    return Response.json(
      { error: `You can send ${LIMITS.messagesPerHour} messages an hour. Try again later.` },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  const tools = createTools(supabase);
  const previous = await loadMessages(supabase, parsed.id);
  const messages = await validateUIMessages({ messages: [...previous, parsed.message], tools });

  const result = streamText({
    model: getChatModel(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: isStepCount(LIMITS.maxToolSteps),
    telemetry: { isEnabled: true, functionId: "chat" },
    onError: ({ error }) => console.error("[chat] stream error", error),
  });

  // Finish and save the reply even if the browser disconnects mid-stream.
  result.consumeStream();

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
      onEnd: async ({ messages: finished }) => {
        try {
          await saveChat(supabase, parsed.id, finished);
        } catch (error) {
          console.error("[chat] save failed", error);
        }
      },
    }),
  });
}
