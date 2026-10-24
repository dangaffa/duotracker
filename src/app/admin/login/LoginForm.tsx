"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const ERRORS: Record<string, string> = {
  not_admin: "That account isn't on the admin list.",
  link: "That sign-in link is invalid or expired. Request a new one.",
};

type Mode = "password" | "link";
type State = "idle" | "working" | "sent" | "failed" | "wrong_password" | "rate_limited";

export function LoginForm() {
  const error = useSearchParams().get("error");
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<State>("idle");

  if (!isSupabaseConfigured) {
    return <p className="text-muted">Connect Supabase in .env.local to enable admin sign-in.</p>;
  }

  async function signInWithPassword() {
    const { error } = await createBrowserSupabase().auth.signInWithPassword({ email, password });
    if (!error) {
      // The session cookie is set; refresh so the server sees it, then go to admin.
      router.refresh();
      router.push("/admin");
      return;
    }
    if (error.status === 429) setState("rate_limited");
    // Same message for an unknown email and a wrong password, so neither is revealed.
    else if (error.status === 400) setState("wrong_password");
    else setState("failed");
  }

  async function sendLink() {
    const { error } = await createBrowserSupabase().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=/admin`,
        // Only existing accounts get a link; this form never creates one.
        shouldCreateUser: false,
      },
    });
    // An unknown email is refused with "signups not allowed". Show the same message as a
    // success so the form doesn't reveal which emails have accounts.
    const unknownEmail = error && (error.status === 422 || /signup/i.test(error.message));
    // Supabase's built-in mail sender only allows a few emails an hour per project.
    if (error?.status === 429) setState("rate_limited");
    else setState(error && !unknownEmail ? "failed" : "sent");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("working");
    if (mode === "password") await signInWithPassword();
    else await sendLink();
  }

  if (state === "sent") {
    return (
      <p className="rounded-lg border border-border bg-surface p-4">
        If {email} is an admin account, a sign-in link is on its way.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && ERRORS[error] && <p className="text-sm text-[var(--status-unoptimized)]">{ERRORS[error]}</p>}

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1 text-sm font-semibold">
        {(
          [
            ["password", "Password"],
            ["link", "Email link"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => {
              setMode(value);
              setState("idle");
            }}
            className={`rounded-md py-1.5 ${mode === value ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        type="email"
        required
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="field"
        aria-label="Email"
      />
      {mode === "password" && (
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="field"
          aria-label="Password"
        />
      )}

      <button className="btn btn-primary w-full" disabled={state === "working"}>
        {state === "working"
          ? mode === "password"
            ? "Signing in…"
            : "Sending…"
          : mode === "password"
            ? "Sign in"
            : "Email me a sign-in link"}
      </button>

      {mode === "password" && state === "idle" && (
        <p className="text-xs text-muted">
          No password yet? Use an email link once, then set one under Admin → Account.
        </p>
      )}
      {state === "wrong_password" && (
        <p className="text-sm text-[var(--status-unoptimized)]">That email and password don&apos;t match.</p>
      )}
      {state === "failed" && (
        <p className="text-sm text-[var(--status-unoptimized)]">
          {mode === "password" ? "Couldn't sign in." : "Couldn't send the link."} Try again.
        </p>
      )}
      {state === "rate_limited" && (
        <p className="text-sm text-[var(--status-unoptimized)]">
          {mode === "password"
            ? "Too many sign-in attempts. Wait a few minutes and try again."
            : "Too many sign-in emails have been sent recently. Wait a while (up to an hour) and try again, or use the last link you received if it hasn't expired."}
        </p>
      )}
    </form>
  );
}
