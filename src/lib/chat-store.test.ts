import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { hasContent, titleFrom } from "./chat-store";

const msg = (role: "user" | "assistant", text: string): UIMessage => ({
  id: Math.random().toString(36),
  role,
  parts: [{ type: "text", text }],
});

describe("titleFrom", () => {
  it("uses the first user message", () => {
    expect(titleFrom([msg("user", "  Plan my   trip "), msg("assistant", "Sure")])).toBe("Plan my trip");
  });

  it("truncates long titles to 60 characters", () => {
    const title = titleFrom([msg("user", "a".repeat(100))]);
    expect(title).toHaveLength(58);
    expect(title.endsWith("…")).toBe(true);
  });

  it("falls back when there is no user text", () => {
    expect(titleFrom([])).toBe("New chat");
  });
});

describe("hasContent", () => {
  it("is false for an empty assistant reply", () => {
    expect(hasContent({ id: "a", role: "assistant", parts: [{ type: "step-start" }] } as UIMessage)).toBe(false);
    expect(hasContent(msg("assistant", "  "))).toBe(false);
  });

  it("is true for text or a tool step", () => {
    expect(hasContent(msg("assistant", "Hi"))).toBe(true);
    expect(hasContent({ id: "a", role: "assistant", parts: [{ type: "tool-getCurrentTime" }] } as unknown as UIMessage)).toBe(true);
  });
});
