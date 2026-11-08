import type { ThreadSummary } from "./chat-store";

export type ThreadGroup = { label: string; threads: ThreadSummary[] };

const LABELS = ["Today", "Yesterday", "Previous 7 days", "Older"] as const;

/** Groups chats by how recently they changed, in the viewer's local time. Empty groups are left out. */
export function groupThreads(threads: ThreadSummary[], now = new Date()): ThreadGroup[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  const buckets: ThreadSummary[][] = [[], [], [], []];

  for (const t of threads) {
    const at = new Date(t.updated_at).getTime();
    const index = at >= startOfToday ? 0 : at >= startOfToday - day ? 1 : at >= startOfToday - 7 * day ? 2 : 3;
    buckets[index].push(t);
  }
  return buckets.flatMap((list, i) => (list.length ? [{ label: LABELS[i], threads: list }] : []));
}
