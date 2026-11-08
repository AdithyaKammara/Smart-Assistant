import { describe, expect, it } from "vitest";
import { DEFAULT_MODELS, resolveModelId, resolveProvider } from "./model";

describe("resolveProvider", () => {
  it("prefers Google when its key is set", () => {
    expect(resolveProvider({ GOOGLE_GENERATIVE_AI_API_KEY: "x", GROQ_API_KEY: "y" })).toBe("google");
  });

  it("uses Groq when only its key is set", () => {
    expect(resolveProvider({ GROQ_API_KEY: "y", AI_GATEWAY_API_KEY: "z" })).toBe("groq");
  });

  it("falls back to the AI Gateway", () => {
    expect(resolveProvider({ AI_GATEWAY_API_KEY: "z" })).toBe("gateway");
    expect(resolveProvider({})).toBe("gateway");
  });

  it("honours CHAT_PROVIDER when it is valid", () => {
    expect(resolveProvider({ CHAT_PROVIDER: "groq", GOOGLE_GENERATIVE_AI_API_KEY: "x" })).toBe("groq");
    expect(resolveProvider({ CHAT_PROVIDER: "nope", GROQ_API_KEY: "y" })).toBe("groq");
  });
});

describe("resolveModelId", () => {
  it("uses the provider default", () => {
    expect(resolveModelId({ GROQ_API_KEY: "y" }).modelId).toBe(DEFAULT_MODELS.groq);
  });

  it("lets CHAT_MODEL override the default", () => {
    expect(
      resolveModelId({ GOOGLE_GENERATIVE_AI_API_KEY: "x", CHAT_MODEL: "gemini-2.5-pro" }).modelId,
    ).toBe("gemini-2.5-pro");
  });
});
