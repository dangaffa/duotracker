"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { STATUSES, STATUS_META, type DuoStatus } from "@/lib/status";
import { StatusBadge } from "@/components/StatusBadge";
import { StoreLinkField } from "@/components/StoreLinkField";
import { submitSuggestion } from "./actions";

type AppOption = { id: string; slug: string; name: string; status: DuoStatus };

export function SubmitForm({ apps }: { apps: AppOption[] }) {
  const params = useSearchParams();
  const preselected = apps.find((a) => a.slug === params.get("app"));
  const [kind, setKind] = useState<"update" | "new_app">(
    params.get("kind") === "new_app" || apps.length === 0 ? "new_app" : "update",
  );
  const [appId, setAppId] = useState(preselected?.id ?? "");
  const [name, setName] = useState("");
  const [developer, setDeveloper] = useState("");
  const [state, action, pending] = useActionState(submitSuggestion, null);

  const current = apps.find((a) => a.id === appId);

  if (state?.ok) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-lg font-semibold">{state.message}</p>
        <Link href="/" className="btn">
          Back to apps
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 rounded-xl border border-border bg-surface p-5">
      <input type="hidden" name="kind" value={kind} />
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1 text-sm font-semibold">
        {(
          [
            ["update", "Update an app"],
            ["new_app", "Add a new app"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`rounded-md py-2 ${kind === value ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {kind === "update" ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">App</span>
          <select name="app_id" value={appId} onChange={(e) => setAppId(e.target.value)} className="field" required>
            <option value="" disabled>
              Choose an app…
            </option>
            {apps.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {current && (
            <span className="flex items-center gap-2 text-sm text-muted">
              Currently: <StatusBadge status={current.status} />
            </span>
          )}
        </label>
      ) : (
        <>
          <StoreLinkField
            hint="Paste the app's App Store link and we'll fill in the rest."
            onFound={(app) => {
              setName((n) => n || app.name);
              setDeveloper((d) => d || app.developer);
            }}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">App name</span>
              <input
                name="name"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">Developer</span>
              <input
                name="developer"
                maxLength={80}
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                className="field"
              />
            </label>
          </div>
        </>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">
          How does it run on the Duo?{" "}
          <Link href="/about" target="_blank" className="font-normal text-accent">
            See examples
          </Link>
        </legend>
        {STATUSES.map((s) => (
          <label
            key={s}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[:checked]:border-accent"
          >
            <input type="radio" name="status" value={s} required className="mt-1" />
            <span className="space-y-1">
              <StatusBadge status={s} />
              <span className="block text-sm text-muted">{STATUS_META[s].blurb}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">App version tested</span>
          <input name="app_version" maxLength={40} placeholder="e.g. 4.12.1" className="field" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Your name (optional)</span>
          <input name="submitter_name" maxLength={60} className="field" />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">Details</span>
        <textarea
          name="details"
          rows={4}
          maxLength={2000}
          placeholder="What did you see? e.g. which screen, which controls are covered…"
          className="field"
        />
      </label>

      {state && !state.ok && <p className="text-sm font-medium text-[var(--status-unoptimized)]">{state.message}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Sending…" : "Send for review"}
      </button>
    </form>
  );
}
