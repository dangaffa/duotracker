"use client";

import { useRef, useState, useTransition } from "react";
import { lookupAppStoreLink } from "@/app/appstore-actions";
import type { StoreApp } from "@/lib/appstore";

/**
 * App Store link input that looks the app up when a link is pasted or typed, then hands
 * the result to `onFound` (to fill in other fields) and shows a small preview.
 */
export function StoreLinkField({
  defaultValue,
  onFound,
  label = "App Store link",
  hint,
}: {
  defaultValue?: string | null;
  onFound: (app: StoreApp) => void;
  label?: string;
  hint?: string;
}) {
  const [found, setFound] = useState<StoreApp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const last = useRef(defaultValue ?? "");

  function check(value: string) {
    const url = value.trim();
    if (!url || url === last.current) return;
    last.current = url;
    setError(null);
    startTransition(async () => {
      const res = await lookupAppStoreLink(url);
      if (res.ok) {
        setFound(res.app);
        onFound(res.app);
      } else {
        setFound(null);
        setError(res.message);
      }
    });
  }

  return (
    <div className="space-y-1.5">
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">{label}</span>
        <input
          name="app_store_url"
          type="url"
          defaultValue={defaultValue ?? ""}
          placeholder="https://apps.apple.com/…"
          className="field"
          onBlur={(e) => check(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            setTimeout(() => check(text), 0);
          }}
        />
      </label>
      {hint && !found && !error && !pending && <p className="text-xs text-muted">{hint}</p>}
      {pending && <p className="text-xs text-muted">Looking it up…</p>}
      {error && !pending && <p className="text-xs text-[var(--status-unoptimized)]">{error}</p>}
      {found && !pending && (
        <div className="flex items-center gap-3 rounded-lg bg-surface-2 p-2 text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={found.iconUrl} alt="" width={36} height={36} className="rounded-[8px]" />
          <div className="min-w-0">
            <div className="truncate font-semibold">{found.name}</div>
            <div className="truncate text-xs text-muted">
              {found.developer} · version {found.version}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
