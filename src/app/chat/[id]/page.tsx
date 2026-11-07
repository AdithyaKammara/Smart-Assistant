import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Chat } from "@/components/chat";
import { listThreads, loadMessages } from "@/lib/chat-store";
import { createClient } from "@/lib/supabase/server";

export default async function ChatPage({ params }: PageProps<"/chat/[id]">) {
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
    />
  );
}
