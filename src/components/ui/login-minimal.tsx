"use client";

import * as React from "react";
import { MotionConfig, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

export type LoginFormProps = Omit<React.ComponentProps<"form">, "children"> & {
  /** Messages from the server action. */
  error?: string;
  notice?: string;
  pending?: boolean;
};

const COPY = {
  signin: {
    title: "Welcome back",
    lead: "Log in to your account to continue",
    submit: "Log in",
    switchPrompt: "Don't have an account?",
    switchAction: "Sign up",
    autoComplete: "current-password",
  },
  signup: {
    title: "Create your account",
    lead: "Sign up to save your chats and documents",
    submit: "Sign up",
    switchPrompt: "Already have an account?",
    switchAction: "Log in",
    autoComplete: "new-password",
  },
} as const;

/**
 * Minimal login form (adapted from login-minimal). One form handles both
 * modes; the hidden `intent` field tells the server action which one.
 * Google sign-in and password reset are left out until they are configured
 * in Supabase, so there are no buttons that do nothing.
 */
export function LoginForm({ className, error, notice, pending, ...props }: LoginFormProps) {
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const copy = COPY[mode];

  return (
    <MotionConfig reducedMotion="user">
      <form className={cn("flex flex-col gap-6", className)} {...props}>
        <input type="hidden" name="intent" value={mode} />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <p className="font-display text-lg font-medium tracking-tight text-foreground">Riya</p>
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-[-0.025em] text-foreground">
              {copy.title}
            </h1>
            <p className="text-sm text-muted-foreground">{copy.lead}</p>
          </div>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-muted-foreground">
                Email
              </Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
                autoComplete={copy.autoComplete}
                minLength={8}
                required
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-muted-foreground">
              {notice}
            </p>
          )}

          <Button type="submit" disabled={pending} className="h-11 w-full rounded-full font-medium">
            {pending ? "One moment…" : copy.submit}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {copy.switchPrompt}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="rounded-sm font-medium text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              {copy.switchAction}
            </button>
          </p>
        </motion.div>
      </form>
    </MotionConfig>
  );
}

export default LoginForm;
