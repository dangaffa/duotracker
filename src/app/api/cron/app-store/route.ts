import { createClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { refreshStoreData } from "@/lib/appstore";
import { APPS_TAG } from "@/lib/data";
import { SUPABASE_URL } from "@/lib/supabase/config";

/*
 * Daily App Store version check, run by Vercel Cron (see vercel.json).
 * Needs two server-only environment variables in the deployment:
 *   CRON_SECRET          any long random string; Vercel sends it as a Bearer token
 *   SUPABASE_SECRET_KEY  Supabase → Project Settings → API Keys → secret key
 * Without them it does nothing. Never expose the secret key to the browser.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!secret || !serviceKey || !SUPABASE_URL) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const result = await refreshStoreData(supabase);
    revalidateTag(APPS_TAG, "max");
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 502 });
  }
}
