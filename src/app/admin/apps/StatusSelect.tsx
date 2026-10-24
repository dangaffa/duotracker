"use client";

import { useState, useTransition } from "react";
import { STATUSES, STATUS_META, type DuoStatus } from "@/lib/status";
import { setAppStatus } from "../actions";

export function StatusSelect({ id, status }: { id: string; status: DuoStatus }) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_META[value].color }} />
      <select
        value={value}
        disabled={pending}
        aria-label="Status"
        className="field !w-auto !py-1 text-sm"
        onChange={(e) => {
          const next = e.target.value as DuoStatus;
          const prev = value;
          setValue(next);
          setFailed(false);
          startTransition(async () => {
            try {
              await setAppStatus(id, next);
            } catch {
              setValue(prev);
              setFailed(true);
            }
          });
        }}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-muted">Saving…</span>}
      {failed && <span className="text-xs text-[var(--status-unoptimized)]">Failed</span>}
    </div>
  );
}
