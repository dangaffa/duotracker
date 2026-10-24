"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { STATUSES } from "@/lib/status";

export type SubmitState = { ok: boolean; message: string } | null;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("update"),
    app_id: z.uuid({ message: "Pick an app from the list." }),
    status: z.enum(STATUSES),
    app_version: optionalText(40),
    details: optionalText(2000),
    submitter_name: optionalText(60),
  }),
  z.object({
    kind: z.literal("new_app"),
    name: z.string().trim().min(1, "App name is required.").max(80),
    developer: optionalText(80),
    app_store_url: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || undefined)
      .refine((v) => !v || v.startsWith("https://apps.apple.com/"), "Use an apps.apple.com link."),
    status: z.enum(STATUSES),
    app_version: optionalText(40),
    details: optionalText(2000),
    submitter_name: optionalText(60),
  }),
]);

export async function submitSuggestion(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  // Honeypot: real people never see or fill this field.
  if (formData.get("website")) return { ok: true, message: "Thanks! Your suggestion is waiting for review." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  if (!isSupabaseConfigured) {
    return { ok: false, message: "Submissions are disabled until the database is connected." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const ipHash = createHash("sha256")
    .update(`${ip}:${process.env.IP_HASH_SALT ?? "duotracker"}`)
    .digest("hex");

  const d = parsed.data;
  const { error } = await createPublicClient().rpc("submit_suggestion", {
    p_kind: d.kind,
    p_status: d.status,
    p_app_id: d.kind === "update" ? d.app_id : null,
    p_name: d.kind === "new_app" ? d.name : null,
    p_developer: d.kind === "new_app" ? d.developer : null,
    p_app_store_url: d.kind === "new_app" ? d.app_store_url : null,
    p_app_version: d.app_version,
    p_details: d.details,
    p_submitter_name: d.submitter_name,
    p_ip_hash: ipHash,
  });

  if (error) {
    if (error.message.includes("rate_limited"))
      return { ok: false, message: "You've sent a lot of suggestions recently. Try again in an hour." };
    if (error.message.includes("app_exists"))
      return { ok: false, message: "That app is already listed. Suggest a status update for it instead." };
    return { ok: false, message: "Something went wrong saving your suggestion. Please try again." };
  }

  return { ok: true, message: "Thanks! Your suggestion is waiting for review." };
}
