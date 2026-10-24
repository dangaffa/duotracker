"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const ERRORS: Record<string, string> = {
  not_admin: "That account isn't on the admin list.",
  link: "That sign-in link is invalid or expired. Request a new one.",
};

export function LoginForm() {
  const error = useSearchParams().get("error");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  if (!isSupabaseConfigured) {
    return <p className="text-muted">Connect Supabase in .env.local to enable admin sign-in.</p>;
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
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
    setState(error && !unknownEmail ? "failed" : "sent");
  }

  if (state === "sent") {
    return (
      <p className="rounded-lg border border-border bg-surface p-4">
        If {email} is an admin account, a sign-in link is on its way.
      </p>
    );
  }

  return (
    <form onSubmit={send} className="space-y-3">
      {error && ERRORS[error] && <p className="text-sm text-[var(--status-unoptimized)]">{ERRORS[error]}</p>}
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="field"
        aria-label="Email"
      />
      <button className="btn btn-primary w-full" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {state === "failed" && <p className="text-sm text-[var(--status-unoptimized)]">Couldn&apos;t send the link. Try again.</p>}
    </form>
  );
}
