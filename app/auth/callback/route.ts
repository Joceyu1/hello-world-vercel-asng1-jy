import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (code) {
        const supabase = await createClient();

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            const response = NextResponse.redirect(
                new URL("/members", url.origin)
            );

            response.headers.set("Cache-Control", "private, no-store");
            return response;
        }
    }

    return new NextResponse(
        "Google sign-in failed. Return to /login and try again.",
        {
            status: 400,
            headers: { "Cache-Control": "private, no-store" },
        }
    );
}