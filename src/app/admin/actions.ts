"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { refreshStoreData } from "@/lib/appstore";
import { APPS_TAG } from "@/lib/data";
import { STATUSES, isStatus } from "@/lib/status";

export type ActionResult = { ok: boolean; message: string } | null;

function refresh() {
  updateTag(APPS_TAG);
  revalidatePath("/admin", "layout");
}

type AdminClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

/** Pull App Store details for the given apps. Never fails the surrounding save: the store can be down. */
async function syncStore(supabase: AdminClient, appIds?: string[]) {
  try {
    await refreshStoreData(supabase, appIds);
  } catch (e) {
    console.warn("App Store refresh failed:", e);
  }
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* -------------------------------- Queue -------------------------------- */

export async function approveSubmission(formData: FormData) {
  const { supabase } = await requireAdmin();
  const override = formData.get("status");
  const { data: appId, error } = await supabase.rpc("approve_submission", {
    p_id: String(formData.get("id")),
    p_status: isStatus(override) ? override : null,
    p_reviewer_note: String(formData.get("reviewer_note") ?? "") || null,
  });
  if (error) throw new Error(error.message);
  if (appId) await syncStore(supabase, [appId as string]);
  refresh();
}

export async function rejectSubmission(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("reject_submission", {
    p_id: String(formData.get("id")),
    p_reviewer_note: String(formData.get("reviewer_note") ?? "") || null,
  });
  if (error) throw new Error(error.message);
  refresh();
}

/* --------------------------------- Apps -------------------------------- */

const blank = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

const appSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required.").max(80),
  slug: z.string().trim().optional(),
  developer: z.string().max(80).optional(),
  app_store_url: z
    .string()
    .optional()
    .refine((v) => !v?.trim() || v.trim().startsWith("https://apps.apple.com/"), "App Store link must be an apps.apple.com URL."),
  icon_url: z.string().optional(),
  status: z.enum(STATUSES),
  app_version: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
  mark_verified: z.string().optional(),
});

export async function saveApp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = appSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;

  const row = {
    name: d.name,
    slug: slugify(d.slug || d.name),
    developer: blank(d.developer),
    app_store_url: blank(d.app_store_url),
    icon_url: blank(d.icon_url),
    status: d.status,
    app_version: blank(d.app_version),
    notes: blank(d.notes),
    ...(d.mark_verified || !d.id ? { verified_at: new Date().toISOString() } : {}),
  };

  const { data: saved, error } = d.id
    ? await supabase.from("apps").update(row).eq("id", d.id).select("id").single()
    : await supabase.from("apps").insert(row).select("id").single();

  if (error) {
    if (error.code === "23505") return { ok: false, message: `The slug "${row.slug}" is already used by another app.` };
    return { ok: false, message: error.message };
  }

  if (row.app_store_url) await syncStore(supabase, [saved.id]);
  refresh();
  if (!d.id) redirect("/admin/apps");
  return { ok: true, message: "Saved." };
}

export async function setAppStatus(id: string, status: string) {
  const { supabase } = await requireAdmin();
  if (!isStatus(status)) throw new Error("Invalid status");
  const { error } = await supabase
    .from("apps")
    .update({ status, verified_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteApp(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("apps").delete().eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  refresh();
  redirect("/admin/apps");
}

/**
 * Bulk add/update from pasted CSV: `name,status,developer,app_store_url` per line.
 * Existing apps (matched by slug) get their status and any provided fields updated.
 */
export async function importApps(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const lines = String(formData.get("csv") ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = [];
  for (const [i, line] of lines.entries()) {
    const [name, status, developer, url] = parseCsvLine(line);
    if (i === 0 && name?.toLowerCase() === "name") continue; // header row
    if (!name || !isStatus(status)) {
      return { ok: false, message: `Line ${i + 1}: needs a name and one of ${STATUSES.join(", ")}.` };
    }
    rows.push({
      name,
      slug: slugify(name),
      status,
      ...(developer ? { developer } : {}),
      ...(url ? { app_store_url: url } : {}),
      verified_at: new Date().toISOString(),
    });
  }
  if (rows.length === 0) return { ok: false, message: "Nothing to import." };

  // One row at a time so blank optional columns leave existing values alone.
  for (const row of rows) {
    const { error } = await supabase.from("apps").upsert(row, { onConflict: "slug" });
    if (error) {
      refresh();
      return { ok: false, message: `Stopped at ${row.name}: ${error.message}` };
    }
  }

  await syncStore(supabase);
  refresh();
  return { ok: true, message: `Imported ${rows.length} app${rows.length === 1 ? "" : "s"}.` };
}

/* ------------------------------ App Store ------------------------------ */

/** Ask the App Store for the latest version of every app that has a link. */
export async function checkAppStore(): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  try {
    const { checked, missing } = await refreshStoreData(supabase);
    refresh();
    return {
      ok: true,
      message: `Checked ${checked} app${checked === 1 ? "" : "s"}.${missing ? ` ${missing} not found on the App Store.` : ""}`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "App Store check failed." };
  }
}

/** Confirms the rating still holds on the App Store's latest version. */
export async function markChecked(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const { data: app, error } = await supabase.from("apps").select("store_version").eq("id", id).single();
  if (error) throw new Error(error.message);
  const { error: updateError } = await supabase
    .from("apps")
    .update({ app_version: app.store_version, verified_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) throw new Error(updateError.message);
  refresh();
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === "," || ch === "\t") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/* -------------------------------- Session ------------------------------- */

export async function signOut() {
  const { supabase } = await requireAdmin();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/* -------------------------------- Account ------------------------------- */

const MIN_PASSWORD = 12;

/** Sets (or changes) the signed-in admin's password, for signing in without an email link. */
export async function setPassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD) {
    return { ok: false, message: `Use at least ${MIN_PASSWORD} characters.` };
  }
  if (password !== String(formData.get("confirm") ?? "")) {
    return { ok: false, message: "The two passwords don't match." };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "reauthentication_needed") {
      return { ok: false, message: "For security, sign in again with an email link, then set the password straight away." };
    }
    if (error.code === "same_password") return { ok: true, message: "That's already your password." };
    if (error.code === "weak_password") return { ok: false, message: "That password is too easy to guess. Try a longer one." };
    return { ok: false, message: error.message };
  }
  return { ok: true, message: "Password saved. You can now sign in with it." };
}
