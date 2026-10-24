import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/*
 * Apple's public App Store lookup service (no key needed):
 *   https://itunes.apple.com/lookup?id=<id>[,<id>…]&country=<cc>
 * It's rate limited to roughly 20 requests a minute, so lookups are batched.
 */

export type StoreApp = {
  id: number;
  /** Store title trimmed to the app's name ("Discord - Talk, Play…" → "Discord"). */
  name: string;
  developer: string;
  iconUrl: string;
  version: string;
  versionDate: string;
  url: string;
};

const BATCH = 150;

/** Pulls the numeric ID (and store country, if present) out of an apps.apple.com link. */
export function parseAppStoreUrl(url: string): { id: number; country: string } | null {
  const m = /^https:\/\/apps\.apple\.com\/(?:([a-z]{2})\/)?app\/(?:[^/?#]+\/)?id(\d+)/i.exec(url.trim());
  return m ? { id: Number(m[2]), country: (m[1] ?? "us").toLowerCase() } : null;
}

type LookupResult = {
  trackId: number;
  trackName: string;
  sellerName?: string;
  artistName?: string;
  artworkUrl512?: string;
  artworkUrl100?: string;
  version: string;
  currentVersionReleaseDate: string;
  trackViewUrl: string;
};

function cleanName(title: string) {
  return title.split(/\s+[-–—:|]\s+/)[0].trim() || title;
}

function toStoreApp(r: LookupResult): StoreApp {
  return {
    id: r.trackId,
    name: cleanName(r.trackName),
    developer: r.sellerName ?? r.artistName ?? "",
    iconUrl: r.artworkUrl512 ?? r.artworkUrl100 ?? "",
    version: r.version,
    versionDate: r.currentVersionReleaseDate,
    url: r.trackViewUrl.split("?")[0],
  };
}

/** Looks up many apps from one store country, in as few requests as possible. */
export async function lookupMany(ids: number[], country = "us"): Promise<Map<number, StoreApp>> {
  const found = new Map<number, StoreApp>();
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const res = await fetch(
      `https://itunes.apple.com/lookup?id=${chunk.join(",")}&country=${encodeURIComponent(country)}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`App Store lookup failed (${res.status})`);
    const json = (await res.json()) as { results: LookupResult[] };
    for (const r of json.results) if (r.trackId) found.set(r.trackId, toStoreApp(r));
  }
  return found;
}

export async function lookupByUrl(url: string): Promise<StoreApp | null> {
  const parsed = parseAppStoreUrl(url);
  if (!parsed) return null;
  return (await lookupMany([parsed.id], parsed.country)).get(parsed.id) ?? null;
}

/**
 * Refreshes App Store data for apps that have an App Store link: ID, latest version and its
 * release date, and the icon (only filled in when none is set, so a manual icon is kept).
 * Pass `appIds` to limit it to specific apps. The client must be allowed to update apps
 * (a signed-in admin, or the secret key in the scheduled job).
 */
export async function refreshStoreData(supabase: SupabaseClient, appIds?: string[]) {
  let query = supabase.from("apps").select("id, app_store_url, icon_url").not("app_store_url", "is", null);
  if (appIds) query = query.in("id", appIds);
  const { data: apps, error } = await query;
  if (error) throw new Error(error.message);

  const byCountry = new Map<string, { appId: string; storeId: number; hasIcon: boolean }[]>();
  for (const a of apps ?? []) {
    const parsed = parseAppStoreUrl(a.app_store_url);
    if (!parsed) continue;
    const list = byCountry.get(parsed.country) ?? [];
    list.push({ appId: a.id, storeId: parsed.id, hasIcon: Boolean(a.icon_url) });
    byCountry.set(parsed.country, list);
  }

  let checked = 0;
  let missing = 0;
  const now = new Date().toISOString();
  for (const [country, list] of byCountry) {
    const found = await lookupMany(
      list.map((l) => l.storeId),
      country,
    );
    for (const l of list) {
      const s = found.get(l.storeId);
      if (!s) {
        missing++;
        continue;
      }
      const { error: updateError } = await supabase
        .from("apps")
        .update({
          app_store_id: s.id,
          store_version: s.version,
          store_version_date: s.versionDate,
          store_checked_at: now,
          ...(l.hasIcon ? {} : { icon_url: s.iconUrl }),
        })
        .eq("id", l.appId);
      if (updateError) throw new Error(updateError.message);
      checked++;
    }
  }
  return { checked, missing };
}
