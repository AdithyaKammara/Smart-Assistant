import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { Chat } from "@/components/chat";
import { resolveModelId } from "@/lib/ai/model";
import { listThreads, loadMessages } from "@/lib/chat-store";
import { createClient } from "@/lib/supabase/server";

export default function ChatPage({ params }: PageProps<"/chat/[id]">) {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted">Loading your chat…</p>}>
      <ChatLoader params={params} />
    </Suspense>
  );
}

async function ChatLoader({ params }: { params: PageProps<"/chat/[id]">["params"] }) {
  await connection(); // per-user data: render at request time, never prerender
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [messages, threads, { data: documents }] = await Promise.all([
    loadMessages(supabase, id),
    listThreads(supabase),
    supabase.from("documents").select("id, name").order("created_at", { ascending: false }),
  ]);

  return (
    <Chat
      key={id}
      id={id}
      initialMessages={messages}
      threads={threads}
      documents={documents ?? []}
      email={user.email ?? ""}
      model={resolveModelId().modelId}
    />
  );
}
