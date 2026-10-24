import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "./supabase/public";
import { isSupabaseConfigured } from "./supabase/config";
import type { App, StatusHistoryEntry } from "./types";

export const APPS_TAG = "apps";

// Re-check the database every minute. Admin actions clear the cache instantly, but only on
// the server they run on: a change made from localhost (or straight in Supabase) would
// otherwise leave the live site showing old data for up to an hour.
const PUBLIC_DATA = { stale: 60, revalidate: 60, expire: 3600 };

const APP_COLUMNS =
  "id, slug, name, developer, app_store_url, icon_url, status, notes, app_version, verified_at, updated_at, app_store_id, store_version, store_version_date, store_checked_at";

// Shown until Supabase is connected, so the site can be previewed locally.
const DEMO_APPS: App[] = [
  {
    id: "demo-discord",
    slug: "discord",
    name: "Discord",
    developer: "Discord, Inc.",
    app_store_url: null,
    icon_url: null,
    status: "unoptimized",
    notes: "Runs in a letterboxed iPhone-sized window in the middle of the inner display.",
    app_version: null,
    verified_at: "2026-10-24T12:00:00Z",
    updated_at: "2026-10-24T12:00:00Z",
    app_store_id: null,
    store_version: null,
    store_version_date: null,
    store_checked_at: null,
  },
  {
    id: "demo-wegmans",
    slug: "wegmans",
    name: "Wegmans",
    developer: "Wegmans Food Markets",
    app_store_url: null,
    icon_url: null,
    status: "ios27",
    notes: "Fills the display but stops before the status bar.",
    app_version: null,
    verified_at: "2026-10-24T12:00:00Z",
    updated_at: "2026-10-24T12:00:00Z",
    app_store_id: null,
    store_version: null,
    store_version_date: null,
    store_checked_at: null,
  },
];

export async function getApps(): Promise<App[]> {
  "use cache";
  cacheTag(APPS_TAG);
  cacheLife(PUBLIC_DATA);

  if (!isSupabaseConfigured) return DEMO_APPS;

  const { data, error } = await createPublicClient()
    .from("apps")
    .select(APP_COLUMNS)
    .order("name", { ascending: true });
  if (error) throw new Error(`Failed to load apps: ${error.message}`);
  return data as App[];
}

export async function getApp(slug: string): Promise<{ app: App; history: StatusHistoryEntry[] } | null> {
  "use cache";
  cacheTag(APPS_TAG, `app:${slug}`);
  cacheLife(PUBLIC_DATA);

  if (!isSupabaseConfigured) {
    const app = DEMO_APPS.find((a) => a.slug === slug);
    return app ? { app, history: [] } : null;
  }

  const supabase = createPublicClient();
  const { data: app, error } = await supabase.from("apps").select(APP_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`Failed to load app: ${error.message}`);
  if (!app) return null;

  const { data: history } = await supabase
    .from("app_status_history")
    .select("id, status, app_version, note, changed_at")
    .eq("app_id", app.id)
    .order("changed_at", { ascending: false })
    .limit(50);

  return { app: app as App, history: (history ?? []) as StatusHistoryEntry[] };
}
