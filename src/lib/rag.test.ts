import { describe, expect, it } from "vitest";
import { chunkText } from "./rag";

describe("chunkText", () => {
  it("returns one chunk for short text", () => {
    expect(chunkText("Hello world.", 100, 10)).toEqual(["Hello world."]);
  });

  it("returns nothing for blank text", () => {
    expect(chunkText("  \n\n  ", 100, 10)).toEqual([]);
  });

  it("keeps every chunk within the size and covers the whole text", () => {
    const text = Array.from({ length: 50 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
    const chunks = chunkText(text, 200, 40);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 200)).toBe(true);
    expect(chunks[0].startsWith("Sentence number 0")).toBe(true);
    expect(chunks.at(-1)!.endsWith("Sentence number 49 is here.")).toBe(true);
  });

  it("prefers to break at sentence ends", () => {
    const text = "A".repeat(150) + ". " + "B".repeat(150) + ".";
    expect(chunkText(text, 200, 20)[0].endsWith(".")).toBe(true);
  });

  it("always makes progress on text without breaks", () => {
    const chunks = chunkText("x".repeat(1000), 100, 99);
    expect(chunks.length).toBeGreaterThan(5);
  });
});
