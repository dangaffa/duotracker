"use server";

import { lookupByUrl, type StoreApp } from "@/lib/appstore";

export type LinkLookup = { ok: true; app: StoreApp } | { ok: false; message: string };

/** Fills in an app's details from its App Store link. Only proxies Apple's public data. */
export async function lookupAppStoreLink(url: string): Promise<LinkLookup> {
  if (!/^https:\/\/apps\.apple\.com\//i.test(url.trim())) {
    return { ok: false, message: "Use an apps.apple.com link." };
  }
  try {
    const app = await lookupByUrl(url);
    return app ? { ok: true, app } : { ok: false, message: "Couldn't find that app on the App Store." };
  } catch {
    return { ok: false, message: "The App Store didn't respond. Try again in a moment." };
  }
}
