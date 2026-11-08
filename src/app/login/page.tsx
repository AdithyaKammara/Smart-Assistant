"use client";

import { useActionState } from "react";
import { LoginForm } from "@/components/ui/login-minimal";
import { authenticate, type AuthState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, {});

  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-xs">
        <LoginForm action={action} pending={pending} error={state.error} notice={state.notice} />
      </div>
    </main>
  );
}
