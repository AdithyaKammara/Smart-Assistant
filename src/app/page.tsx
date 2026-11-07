import { redirect } from "next/navigation";

/** Every visit to / starts a fresh chat; the thread row is created with its first message. */
export default function Home() {
  redirect(`/chat/${crypto.randomUUID()}`);
}
