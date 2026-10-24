import type { App } from "./types";

/**
 * True when the App Store has a newer release than the one the rating was based on:
 * a different version from the tested one, or (with no tested version recorded) a
 * release after the rating was last verified.
 */
export function needsRecheck(app: Pick<App, "store_version" | "store_version_date" | "app_version" | "verified_at">) {
  if (!app.store_version) return false;
  if (app.app_version) return app.store_version !== app.app_version;
  return Boolean(app.store_version_date && app.store_version_date > app.verified_at);
}
