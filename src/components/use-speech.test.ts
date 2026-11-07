import { describe, expect, it } from "vitest";
import { toSpeakable } from "./use-speech";

describe("toSpeakable", () => {
  it("drops markdown symbols and citation markers", () => {
    expect(toSpeakable("## Plan\n- **Learn** `let` and [docs](https://x.dev) [1]")).toBe("Plan Learn let and docs");
  });

  it("replaces code blocks with a short note", () => {
    expect(toSpeakable("Try this:\n```ts\nconst a = 1;\n```\nDone.")).toBe("Try this: (code block) Done.");
  });
});
