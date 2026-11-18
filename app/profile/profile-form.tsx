"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Spinner } from "@/app/components/feedback";
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
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [operation, setOperation] = useState<"saving" | "uploading" | "signing-out" | null>(null);
  const actionInProgress = useRef(false);
  const busy = operation !== null;
  const progressMessage = operation === "uploading"
    ? "Uploading your profile photo…"
    : operation === "saving"
      ? "Saving your profile…"
      : operation === "signing-out"
        ? "Signing out…"
        : "";

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (actionInProgress.current) return;
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

    actionInProgress.current = true;
    setOperation(file ? "uploading" : "saving");

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
        setOperation("saving");
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
      router.refresh();
      setFirstName(first);
      setLastName(last);
      setMessage("Profile saved.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save profile.",
      );
    } finally {
      actionInProgress.current = false;
      setOperation(null);
    }
  }

  async function signOut() {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    setOperation("signing-out");
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setMessage("Signed out. Opening the sign-in page…");
      router.push("/login");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign out. Please try again.");
    } finally {
      actionInProgress.current = false;
      setOperation(null);
    }
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

      <form onSubmit={saveProfile} aria-busy={busy} aria-describedby="profile-action-status">
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
          {(operation === "saving" || operation === "uploading") && <Spinner />}
          {operation === "uploading" ? "Uploading photo…" : operation === "saving" ? "Saving profile…" : "Save profile"}
        </button>
      </form>

      <p id="profile-action-status" role="status" aria-live="polite" aria-atomic="true">
        {progressMessage || message}
      </p>

      <p>
        <Link href="/members">Go to your listening room</Link>
      </p>

      <button type="button" onClick={signOut} disabled={busy} aria-busy={operation === "signing-out"} aria-describedby="profile-action-status">
        {operation === "signing-out" && <Spinner />}
        {operation === "signing-out" ? "Signing out…" : "Sign out"}
      </button>
    </>
  );
}
