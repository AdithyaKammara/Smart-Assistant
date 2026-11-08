"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string };

const credentials = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Passwords are at least 8 characters"),
});

export async function authenticate(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  if (form.get("intent") === "signup") {
    const { data, error } = await supabase.auth.signUp(parsed.data);
    if (error) return { error: error.message };
    if (!data.session) return { notice: "Check your email to confirm your account, then sign in." };
  } else {
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: error.message };
  }
  redirect(`/chat/${crypto.randomUUID()}`); // straight to a fresh chat, so the URL is shareable and reload-safe
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
