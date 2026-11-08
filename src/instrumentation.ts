/**
 * Langfuse tracing for every model call, through OpenTelemetry. Off unless
 * LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are set, so local dev and CI
 * need no Langfuse account.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) return;

  const [{ registerOTel }, { LangfuseSpanProcessor }, { registerTelemetry }, { OpenTelemetry }] = await Promise.all([
    import("@vercel/otel"),
    import("@langfuse/otel"),
    import("ai"),
    import("@ai-sdk/otel"),
  ]);

  // Reads LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY and LANGFUSE_BASE_URL from the environment.
  registerOTel({ serviceName: "smart-assistant", spanProcessors: [new LangfuseSpanProcessor()] });
  registerTelemetry(new OpenTelemetry());
}
