import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/admin";
import { STATUSES, STATUS_META } from "@/lib/status";
import type { Submission } from "@/lib/types";
import { approveSubmission, rejectSubmission, signOut } from "./actions";

export const metadata: Metadata = { title: "Review queue" };

export default function AdminQueuePage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading queue…</p>}>
      <Queue />
    </Suspense>
  );
}

const timeFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

async function Queue() {
  const { supabase, user } = await requireAdmin();

  const [{ data: pending }, { data: recent }] = await Promise.all([
    supabase
      .from("submissions")
      .select("*, app:apps(name, slug, status)")
      .eq("state", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("submissions")
      .select("*, app:apps(name, slug, status)")
      .neq("state", "pending")
      .order("reviewed_at", { ascending: false })
      .limit(15),
  ]);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          Review queue <span className="text-muted">({pending?.length ?? 0})</span>
        </h1>
        <form action={signOut} className="flex items-center gap-3 text-sm text-muted">
          {user.email}
          <button className="btn !py-1">Sign out</button>
        </form>
      </div>

      {pending?.length ? (
        <ul className="space-y-4">
          {(pending as Submission[]).map((s) => (
            <SubmissionCard key={s.id} s={s} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">
          Nothing waiting for review.
        </p>
      )}

      {!!recent?.length && (
        <section className="space-y-3">
          <h2 className="font-semibold">Recently reviewed</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
            {(recent as Submission[]).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span
                  className="w-20 font-semibold"
                  style={{ color: s.state === "approved" ? "var(--status-duo)" : "var(--status-unoptimized)" }}
                >
                  {s.state}
                </span>
                <span className="font-medium">{s.app?.name ?? s.name}</span>
                <StatusBadge status={s.status} short />
                {s.reviewer_note && <span className="text-muted">“{s.reviewer_note}”</span>}
                <span className="ml-auto text-muted">{s.reviewed_at && timeFmt.format(new Date(s.reviewed_at))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SubmissionCard({ s }: { s: Submission }) {
  const isNew = s.kind === "new_app";
  return (
    <li className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-muted">
          {isNew ? "New app" : "Status update"}
        </span>
        <span className="text-muted">
          {timeFmt.format(new Date(s.created_at))}
          {s.submitter_name && <> · from {s.submitter_name}</>}
        </span>
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold">
          {isNew ? (
            s.name
          ) : (
            <Link href={`/apps/${s.app?.slug}`} target="_blank" className="hover:underline">
              {s.app?.name}
            </Link>
          )}
        </h2>
        {isNew && (
          <p className="text-sm text-muted">
            {[s.developer, s.app_store_url].filter(Boolean).join(" · ") || "No developer or link given"}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {s.app && (
          <>
            <StatusBadge status={s.app.status} />
            <span className="text-muted">→</span>
          </>
        )}
        <StatusBadge status={s.status} />
        {s.app_version && <span className="text-muted">tested on v{s.app_version}</span>}
      </div>

      {s.details && <p className="whitespace-pre-line rounded-lg bg-surface-2 p-3 text-sm">{s.details}</p>}

      <form className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
        <input type="hidden" name="id" value={s.id} />
        <label className="space-y-1 text-xs font-semibold text-muted">
          Approve as
          <select name="status" defaultValue={s.status} className="field !py-1.5 text-sm text-foreground">
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {STATUS_META[st].label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-48 flex-1 space-y-1 text-xs font-semibold text-muted">
          Note (optional)
          <input name="reviewer_note" className="field !py-1.5 text-sm text-foreground" />
        </label>
        <button formAction={approveSubmission} className="btn btn-primary">
          Approve
        </button>
        <button formAction={rejectSubmission} className="btn">
          Reject
        </button>
      </form>
    </li>
  );
}
