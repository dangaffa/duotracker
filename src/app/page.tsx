import Link from "next/link";
import { Suspense } from "react";
import { AppBrowser } from "@/components/AppBrowser";
import { getApps } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">How well do your apps fit the iPhone Duo?</h1>
        <p className="max-w-2xl text-muted">
          Community reports on which apps use the Duo&apos;s displays properly.{" "}
          <Link href="/about" className="font-semibold text-accent">
            What the ratings mean
          </Link>
        </p>
      </section>

      {!isSupabaseConfigured && (
        <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-3 text-sm text-muted">
          Showing demo data. Connect Supabase in <code>.env.local</code> to load the real list.
        </p>
      )}

      <Suspense fallback={<p className="py-8 text-center text-sm text-muted">Loading apps…</p>}>
        <AppList />
      </Suspense>
    </div>
  );
}

// Fetched in its own section: the list refreshes every minute, so the rest of the page
// shouldn't wait on it.
async function AppList() {
  const apps = await getApps();
  return <AppBrowser apps={apps} />;
}
