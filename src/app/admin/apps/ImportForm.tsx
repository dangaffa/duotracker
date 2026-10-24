"use client";

import { useActionState } from "react";
import { STATUSES } from "@/lib/status";
import { importApps } from "../actions";

export function ImportForm() {
  const [state, action, pending] = useActionState(importApps, null);

  return (
    <details className="rounded-xl border border-border bg-surface p-5">
      <summary className="cursor-pointer font-semibold">Bulk import / update from CSV</summary>
      <form action={action} className="mt-4 space-y-3">
        <p className="text-sm text-muted">
          One app per line: <code>name,status,developer,app_store_url</code>. Status is one of{" "}
          {STATUSES.map((s, i) => (
            <span key={s}>
              {i > 0 && ", "}
              <code>{s}</code>
            </span>
          ))}
          . Apps that already exist (same name) get their status updated. You can paste straight from a spreadsheet.
        </p>
        <textarea
          name="csv"
          rows={6}
          className="field font-mono text-xs"
          placeholder={"name,status,developer,app_store_url\nExample App,ios27,Example Co,https://apps.apple.com/app/id000000000"}
        />
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" disabled={pending}>
            {pending ? "Importing…" : "Import"}
          </button>
          {state && (
            <span className="text-sm" style={{ color: state.ok ? "var(--status-duo)" : "var(--status-unoptimized)" }}>
              {state.message}
            </span>
          )}
        </div>
      </form>
    </details>
  );
}
