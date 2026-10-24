import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isSupabaseConfigured } from "./supabase/config";
import { createSessionClient } from "./supabase/server";

/** Returns a session client for a signed-in admin, or redirects to the login page. */
export async function requireAdmin() {
  // Admin pages are always per-request; this also stops Next.js trying to prerender past
  // Supabase's session check, which reads the current time.
  await connection();
  if (!isSupabaseConfigured) redirect("/admin/login");
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/admin/login?error=not_admin");

  return { supabase, user };
}
