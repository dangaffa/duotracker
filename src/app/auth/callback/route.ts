import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

// Magic-link landing: swap the one-time code for a session cookie, then go to the admin area.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  // Only same-site paths: "//host" or "/\host" would send the user to another website.
  const requested = searchParams.get("next") ?? "";
  const next = /^\/(?![/\\])/.test(requested) ? requested : "/admin";

  if (code) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL("/admin/login?error=link", origin));
}
