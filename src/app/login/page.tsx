"use client";

import { useActionState } from "react";
import { authenticate, type AuthState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, {});

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-4 py-12">
      <div className="flex flex-col gap-2">
        <p className="font-display text-xl font-medium tracking-tight">Riya</p>
        <h1 className="font-display text-4xl leading-[1.04] tracking-[-0.035em]">Sign in to your assistant.</h1>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-muted">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-muted">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            className="field"
          />
        </label>

        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.notice && (
          <p role="status" className="text-sm text-muted">
            {state.notice}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <button type="submit" name="intent" value="signin" disabled={pending} className="part part--lit flex-1">
            Sign in
          </button>
          <button type="submit" name="intent" value="signup" disabled={pending} className="part flex-1">
            Create account
          </button>
        </div>
      </form>
    </main>
  );
}
