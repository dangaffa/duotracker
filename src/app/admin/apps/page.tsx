import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppIcon } from "@/components/AppIcon";
import { requireAdmin } from "@/lib/admin";
import { needsRecheck } from "@/lib/recheck";
import type { App } from "@/lib/types";
import { markChecked } from "../actions";
import { CheckStoreButton } from "./CheckStoreButton";
import { ImportForm } from "./ImportForm";
import { StatusSelect } from "./StatusSelect";

export const metadata: Metadata = { title: "Manage apps" };

export default function AdminAppsPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading apps…</p>}>
      <AppsTable />
    </Suspense>
  );
}

async function AppsTable() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("apps")
    .select(
      "id, slug, name, developer, icon_url, status, app_store_url, app_version, verified_at, store_version, store_version_date",
    )
    .order("name");
  const apps = (data ?? []) as App[];
  // Apps with a newer App Store release than their rating go to the top.
  const stale = apps.filter(needsRecheck);
  const rows = [...stale, ...apps.filter((a) => !needsRecheck(a))];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">
          Apps <span className="text-muted">({apps.length})</span>
        </h1>
        <CheckStoreButton />
        <Link href="/admin/apps/new" className="btn btn-primary">
          + Add app
        </Link>
      </div>

      {stale.length > 0 && (
        <p className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "var(--status-ios27)" }}>
          <strong>{stale.length}</strong> app{stale.length === 1 ? " has" : "s have"} a newer App Store version than
          the one {stale.length === 1 ? "its" : "their"} rating is based on. Re-test, then change the rating or confirm
          it&apos;s still accurate.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2.5">App</th>
              <th className="px-4 py-2.5">Status (saves instantly)</th>
              <th className="px-4 py-2.5">Rated on</th>
              <th className="px-4 py-2.5">App Store</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((app) => {
              const flagged = needsRecheck(app);
              return (
                <tr key={app.id}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <AppIcon app={app} size={32} />
                      <div>
                        <div className="font-semibold">{app.name}</div>
                        <div className="text-xs text-muted">{app.developer}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusSelect id={app.id} status={app.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                    {app.app_version ? `v${app.app_version}` : "—"}
                    <div className="text-xs">{new Date(app.verified_at).toLocaleDateString("en-US")}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {!app.app_store_url ? (
                      <span className="text-xs text-muted">No link</span>
                    ) : !app.store_version ? (
                      <span className="text-xs text-muted">Not checked yet</span>
                    ) : flagged ? (
                      <div className="space-y-1">
                        <span className="font-semibold" style={{ color: "var(--status-ios27)" }}>
                          v{app.store_version} out
                        </span>
                        <form action={markChecked}>
                          <input type="hidden" name="id" value={app.id} />
                          <button className="text-xs font-semibold text-accent hover:underline">
                            Still accurate on v{app.store_version}
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-muted">v{app.store_version}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/admin/apps/${app.id}`} className="font-semibold text-accent">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {apps.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No apps yet. Add one, or bulk import below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ImportForm />
    </div>
  );
}
