import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppIcon } from "@/components/AppIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { getApp, getApps } from "@/lib/data";
import { needsRecheck } from "@/lib/recheck";
import { STATUS_META } from "@/lib/status";

export async function generateStaticParams() {
  const apps = await getApps();
  return apps.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/apps/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getApp(slug);
  return { title: result?.app.name ?? "App not found" };
}

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default function AppPage({ params }: PageProps<"/apps/[slug]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <AppDetail params={params} />
    </Suspense>
  );
}

async function AppDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getApp(slug);
  if (!result) notFound();
  const { app, history } = result;

  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← All apps
      </Link>

      <header className="flex flex-wrap items-center gap-4">
        <AppIcon app={app} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{app.name}</h1>
          {app.developer && <p className="text-muted">{app.developer}</p>}
        </div>
        <Link href={`/submit?app=${app.slug}`} className="btn">
          Report a change
        </Link>
      </header>

      {needsRecheck(app) && (
        <p className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "var(--status-ios27)" }}>
          <strong>Version {app.store_version} is out</strong>, newer than the one this rating is based on, so it may
          have changed.{" "}
          <Link href={`/submit?app=${app.slug}`} className="font-semibold text-accent">
            Tried it? Let us know
          </Link>
        </p>
      )}

      <section className="space-y-3 rounded-xl border border-border bg-surface p-5">
        <StatusBadge status={app.status} />
        <p className="text-sm text-muted">{STATUS_META[app.status].blurb}</p>
        {app.notes && <p className="whitespace-pre-line">{app.notes}</p>}
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
          {app.app_version && (
            <div>
              <dt className="inline">Tested version: </dt>
              <dd className="inline font-medium text-foreground">{app.app_version}</dd>
            </div>
          )}
          <div>
            <dt className="inline">Last verified: </dt>
            <dd className="inline font-medium text-foreground">{dateFmt.format(new Date(app.verified_at))}</dd>
          </div>
          {app.app_store_url && (
            <a href={app.app_store_url} className="font-semibold text-accent" target="_blank" rel="noreferrer">
              App Store ↗
            </a>
          )}
        </dl>
      </section>

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">History</h2>
          <ol className="space-y-3 border-l-2 border-border pl-5">
            {history.map((h) => (
              <li key={h.id} className="relative">
                <span
                  className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-background"
                  style={{ background: STATUS_META[h.status].color }}
                />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusBadge status={h.status} />
                  <span className="text-muted">{dateFmt.format(new Date(h.changed_at))}</span>
                  {h.app_version && <span className="text-muted">· v{h.app_version}</span>}
                </div>
                {h.note && <p className="mt-1 text-sm text-muted">{h.note}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
