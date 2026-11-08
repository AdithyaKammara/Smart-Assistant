import { describe, expect, it } from "vitest";
import { groupThreads } from "./thread-groups";

const now = new Date(2026, 10, 8, 15, 0); // 8 Nov 2026, 3 pm local
const at = (daysAgo: number, hour = 12) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour).toISOString();
const thread = (id: string, updated_at: string) => ({ id, title: id, updated_at });

describe("groupThreads", () => {
  it("sorts chats into today, yesterday, the past week and older", () => {
    const groups = groupThreads(
      [thread("a", at(0, 9)), thread("b", at(1, 23)), thread("c", at(5)), thread("d", at(30))],
      now,
    );
    expect(groups.map((g) => [g.label, g.threads.map((t) => t.id)])).toEqual([
      ["Today", ["a"]],
      ["Yesterday", ["b"]],
      ["Previous 7 days", ["c"]],
      ["Older", ["d"]],
    ]);
  });

  it("leaves out empty groups", () => {
    expect(groupThreads([thread("a", at(0))], now).map((g) => g.label)).toEqual(["Today"]);
    expect(groupThreads([], now)).toEqual([]);
  });
});
