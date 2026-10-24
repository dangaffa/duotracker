"use client";

import { useActionState, useRef } from "react";
import { StoreLinkField } from "@/components/StoreLinkField";
import type { StoreApp } from "@/lib/appstore";
import { STATUSES, STATUS_META } from "@/lib/status";
import type { App } from "@/lib/types";
import { saveApp } from "../actions";

export function AppForm({ app }: { app?: App }) {
  const [state, action, pending] = useActionState(saveApp, null);
  const formRef = useRef<HTMLFormElement>(null);

  // Fill in anything still blank from the App Store; never overwrite what's been typed.
  function fillFromStore(found: StoreApp) {
    const form = formRef.current;
    if (!form) return;
    const fill = (name: string, value: string) => {
      const input = form.elements.namedItem(name) as HTMLInputElement | null;
      if (input && !input.value.trim() && value) input.value = value;
    };
    fill("name", found.name);
    fill("developer", found.developer);
    fill("icon_url", found.iconUrl);
    if (!app) fill("app_version", found.version);
  }

  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      {app && <input type="hidden" name="id" value={app.id} />}

      <StoreLinkField
        defaultValue={app?.app_store_url}
        onFound={fillFromStore}
        hint="Paste a link to fill in the name, developer and icon. The latest version is tracked automatically."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" defaultValue={app?.name} required />
        <Field label="Slug (URL)" name="slug" defaultValue={app?.slug} placeholder="Generated from name" />
        <Field label="Developer" name="developer" defaultValue={app?.developer} />
        <Field label="Icon URL" name="icon_url" defaultValue={app?.icon_url} />
        <Field label="Tested app version" name="app_version" defaultValue={app?.app_version} />
        {app?.store_version && (
          <div className="space-y-1.5 text-sm">
            <span className="font-semibold">On the App Store</span>
            <p className="py-2 text-muted">
              Version {app.store_version}
              {app.store_version_date && <>, released {new Date(app.store_version_date).toLocaleDateString("en-US")}</>}
            </p>
          </div>
        )}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">Status</span>
        <select name="status" defaultValue={app?.status ?? "unoptimized"} className="field">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">Notes (shown publicly)</span>
        <textarea name="notes" rows={4} maxLength={2000} defaultValue={app?.notes ?? ""} className="field" />
      </label>

      {app && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="mark_verified" defaultChecked />
          Set &ldquo;last verified&rdquo; to today
        </label>
      )}

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : app ? "Save changes" : "Add app"}
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

function Field({
  label,
  name,
  defaultValue,
  ...rest
}: { label: string; name: string; defaultValue?: string | null } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "defaultValue"
>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <input name={name} defaultValue={defaultValue ?? ""} className="field" {...rest} />
    </label>
  );
}
