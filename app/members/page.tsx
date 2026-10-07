import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  if (!isSupabaseConfigured()) redirect("/login");
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
      }`,
    );
  }

  // Require both names before showing the members page.
  if (!profile.first_name?.trim() || !profile.last_name?.trim()) {
    redirect("/profile");
  }

  return (
    <section className="account-page">
      <p className="eyebrow account-kicker">YOUR LISTENING ROOM</p>
      <h1>You’re on the guest list.</h1>

      <p style={{ marginTop: "20px" }}>
        Welcome, {profile.first_name} {profile.last_name}!
      </p>

      <p>
        Your profile is ready. Create an AI mixtape note or help the best
        B-sides rise.
      </p>

      <nav
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          marginTop: "24px",
        }}
      >
        <Link href="/#studio">Make a B-side</Link>
        <Link href="/#wall">Vote on notes</Link>
        <Link href="/profile">Edit Profile</Link>
      </nav>
    </section>
  );
}
