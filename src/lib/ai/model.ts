import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

export type Provider = "google" | "groq" | "gateway";

/** Default model per provider; override any of them with CHAT_MODEL. */
export const DEFAULT_MODELS: Record<Provider, string> = {
  google: "gemini-3.5-flash",
  groq: "openai/gpt-oss-120b",
  gateway: "anthropic/claude-sonnet-5.5",
};

type Env = Record<string, string | undefined>;

/**
 * Picks the provider from whichever API key is set. Google Gemini and Groq both
 * have free tiers that don't need a credit card, so they come first; the Vercel
 * AI Gateway is used when its key is the only one present.
 */
export function resolveProvider(env: Env = process.env): Provider {
  const forced = env.CHAT_PROVIDER as Provider | undefined;
  if (forced && forced in DEFAULT_MODELS) return forced;
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) return "google";
  if (env.GROQ_API_KEY) return "groq";
  return "gateway";
}

export function resolveModelId(env: Env = process.env): { provider: Provider; modelId: string } {
  const provider = resolveProvider(env);
  return { provider, modelId: env.CHAT_MODEL || DEFAULT_MODELS[provider] };
}

export function getChatModel(env: Env = process.env): LanguageModel {
  const { provider, modelId } = resolveModelId(env);
  switch (provider) {
    case "google":
      return google(modelId);
    case "groq":
      return groq(modelId);
    case "gateway":
      return modelId; // plain "provider/model" string, routed through AI Gateway
  }
}
