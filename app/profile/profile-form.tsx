"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
    userId: string;
    initialFirstName: string;
    initialLastName: string;
    initialAvatarUrl: string | null;
};

export default function ProfileForm({
                                        userId,
                                        initialFirstName,
                                        initialLastName,
                                        initialAvatarUrl,
                                    }: Props) {
    const [firstName, setFirstName] = useState(initialFirstName);
    const [lastName, setLastName] = useState(initialLastName);
    const [file, setFile] = useState<File | null>(null);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    async function saveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage("");

        const first = firstName.trim();
        const last = lastName.trim();

        if (!first || !last) {
            setMessage("Please enter both your first and last name.");
            return;
        }

        if (file) {
            const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

            if (!allowedTypes.includes(file.type)) {
                setMessage("Choose a JPG, PNG, or WebP image.");
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                setMessage("Choose an image smaller than 2 MB.");
                return;
            }
        }

        setBusy(true);

        try {
            const supabase = createClient();

            const updates: {
                first_name: string;
                last_name: string;
                avatar_path?: string;
            } = {
                first_name: first,
                last_name: last,
            };

            if (file) {
                const path = `${userId}/avatar`;

                const { error: uploadError } = await supabase.storage
                    .from("avatars")
                    .upload(path, file, {
                        upsert: true,
                        contentType: file.type,
                        cacheControl: "0",
                    });

                if (uploadError) {
                    throw uploadError;
                }

                updates.avatar_path = path;
            }

            const { error } = await supabase
                .from("profiles")
                .update(updates)
                .eq("id", userId)
                .select("id")
                .single();

            if (error) {
                throw error;
            }

            // Load the profile again to display the saved values and photo.
            window.location.assign("/profile");
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "Could not save profile."
            );
            setBusy(false);
        }
    }

    async function signOut() {
        setBusy(true);
        setMessage("");

        const supabase = createClient();
        const { error } = await supabase.auth.signOut();

        if (error) {
            setMessage(error.message);
            setBusy(false);
            return;
        }

        window.location.assign("/login");
    }

    return (
        <>
            {initialAvatarUrl && (
                // Signed URLs can use a standard image element.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={initialAvatarUrl}
                    alt="Your profile photo"
                    width={120}
                    height={120}
                    style={{ objectFit: "cover", borderRadius: "50%" }}
                />
            )}

            <form onSubmit={saveProfile}>
                <p>
                    <label htmlFor="first-name">First name</label>
                    <br />
                    <input
                        id="first-name"
                        name="firstName"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        maxLength={100}
                        required
                        disabled={busy}
                    />
                </p>

                <p>
                    <label htmlFor="last-name">Last name</label>
                    <br />
                    <input
                        id="last-name"
                        name="lastName"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        maxLength={100}
                        required
                        disabled={busy}
                    />
                </p>

                <p>
                    <label htmlFor="photo">Profile photo</label>
                    <br />
                    <input
                        id="photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                            setFile(event.target.files?.[0] ?? null);
                        }}
                        disabled={busy}
                    />
                </p>

                <button type="submit" disabled={busy}>
                    {busy ? "Please wait…" : "Save profile"}
                </button>

                <p role="status">{message}</p>
            </form>

            <p>
                <Link href="/members">Go to members page</Link>
            </p>

            <button type="button" onClick={signOut} disabled={busy}>
                Sign out
            </button>
        </>
    );
}