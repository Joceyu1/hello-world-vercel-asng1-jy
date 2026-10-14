import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isColumbiaGoogleUser } from "@/lib/auth/columbia";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Fetch the authoritative user; neither the chooser hint nor editable
      // user_metadata establishes a verified Columbia Google identity.
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !isColumbiaGoogleUser(user)) {
        await supabase.auth.signOut({ scope: "local" });
        const response = NextResponse.redirect(new URL("/access-denied", url.origin));
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      }
      const response = NextResponse.redirect(new URL("/members", url.origin));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }

  return new NextResponse("Google sign-in failed. Return to /login and try again.", {
    status: 400,
    headers: { "Cache-Control": "private, no-store" },
  });
}
