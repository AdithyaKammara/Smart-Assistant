import type { UIMessage } from "ai";
import type { Supabase } from "./supabase/server";

export type ThreadSummary = { id: string; title: string };

/** All queries run as the signed-in user, so row level security scopes them to their own rows. */
export async function loadMessages(supabase: Supabase, threadId: string): Promise<UIMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, parts")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as UIMessage[];
}

export async function listThreads(supabase: Supabase): Promise<ThreadSummary[]> {
  const { data, error } = await supabase
    .from("threads")
    .select("id, title")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export function titleFrom(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  const text = first?.parts.find((p) => p.type === "text");
  const title = text && "text" in text ? text.text.trim().replace(/\s+/g, " ") : "";
  return title.length > 60 ? `${title.slice(0, 57)}…` : title || "New chat";
}

/**
 * Saves a finished turn. Existing messages are left alone (ignoreDuplicates);
 * new ones get increasing timestamps so the transcript keeps its order.
 */
export async function saveChat(supabase: Supabase, threadId: string, messages: UIMessage[]) {
  const now = Date.now();
  const { error: threadError } = await supabase
    .from("threads")
    .upsert({ id: threadId, title: titleFrom(messages), updated_at: new Date(now).toISOString() });
  if (threadError) throw threadError;

  const rows = messages.map((m, i) => ({
    id: m.id,
    thread_id: threadId,
    role: m.role,
    parts: m.parts,
    created_at: new Date(now - (messages.length - i)).toISOString(),
  }));
  const { error } = await supabase.from("messages").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}

/** Messages a user sent in the last hour, for rate limiting. */
export async function recentUserMessageCount(supabase: Supabase): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}
