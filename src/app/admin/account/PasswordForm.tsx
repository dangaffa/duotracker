"use client";

import { useActionState } from "react";
import { setPassword } from "../actions";

export function PasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(setPassword, null);
  return (
    <form action={action} className="space-y-3">
      {/* Lets password managers file the new password under the right account. */}
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
      <input
        type="password"
        name="password"
        required
        minLength={12}
        autoComplete="new-password"
        placeholder="New password (12+ characters)"
        className="field"
        aria-label="New password"
      />
      <input
        type="password"
        name="confirm"
        required
        autoComplete="new-password"
        placeholder="Repeat it"
        className="field"
        aria-label="Repeat new password"
      />
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save password"}
        </button>
        {state && (
          <span className="text-sm" style={{ color: state.ok ? "var(--status-duo)" : "var(--status-unoptimized)" }}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
