import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_path")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        throw new Error("Could not load your profile.");
    }

    let avatarUrl: string | null = null;

    if (profile.avatar_path) {
        const { data } = await supabase.storage
            .from("avatars")
            .createSignedUrl(profile.avatar_path, 3600);

        avatarUrl = data?.signedUrl ?? null;
    }

    const needsNames =
        !profile.first_name?.trim() || !profile.last_name?.trim();

    return (
        <main>
            <h1>Your profile</h1>

            {needsNames && (
                <p>Please enter your first and last name to finish signing up.</p>
            )}

            <ProfileForm
                userId={user.id}
                initialFirstName={profile.first_name ?? ""}
                initialLastName={profile.last_name ?? ""}
                initialAvatarUrl={avatarUrl}
            />
        </main>
    );
}