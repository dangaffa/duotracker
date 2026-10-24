"use client";

import { useActionState } from "react";
import { checkAppStore } from "../actions";

export function CheckStoreButton() {
  const [state, action, pending] = useActionState(checkAppStore, null);
  return (
    <form action={action} className="flex items-center gap-3">
      {state && (
        <span className="text-sm" style={{ color: state.ok ? "var(--muted)" : "var(--status-unoptimized)" }}>
          {state.message}
        </span>
      )}
      <button className="btn" disabled={pending}>
        {pending ? "Checking…" : "Check App Store now"}
      </button>
    </form>
  );
}
