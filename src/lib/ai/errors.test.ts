import { describe, expect, it } from "vitest";
import { friendlyError } from "./errors";

describe("friendlyError", () => {
  it("explains a used-up free quota", () => {
    expect(friendlyError(new Error("You exceeded your current quota"))).toMatch(/free daily limit/);
  });

  it("explains a rejected key", () => {
    expect(friendlyError(new Error("401 Unauthorized"))).toMatch(/API key/);
  });

  it("falls back to a generic message without leaking details", () => {
    const message = friendlyError(new Error("socket hang up at 10.0.0.5:443"));
    expect(message).not.toContain("10.0.0.5");
  });
});
