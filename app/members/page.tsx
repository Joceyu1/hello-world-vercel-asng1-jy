import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MembersPage() {
    const supabase = await createClient();

    // Verify that the user is logged in.
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    // Read this user's profile.
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        throw new Error(
            `Could not load your profile: ${
                profileError
                    ? `${profileError.code} — ${profileError.message}`
                    : "No profile returned"
            }`
        );
    }

    // Require both names before showing the members page.
    if (!profile.first_name?.trim() || !profile.last_name?.trim()) {
        redirect("/profile");
    }

    return (
        <main
            style={{
                minHeight: "100vh",
                padding: "40px",
                background: "linear-gradient(135deg, hotpink, purple, cyan)",
                color: "white",
                textAlign: "center",
            }}
        >
            <h1 style={{ fontSize: "36px", fontWeight: "bold" }}>
                Members Only
            </h1>

            <p style={{ marginTop: "20px" }}>
                Welcome, {profile.first_name} {profile.last_name}!
            </p>

            <p>You are logged in and can access this protected page.</p>

            <nav
                style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "20px",
                    marginTop: "24px",
                }}
            >
                <Link href="/">Home</Link>
                <Link href="/profile">Edit Profile</Link>
            </nav>
        </main>
    );
}