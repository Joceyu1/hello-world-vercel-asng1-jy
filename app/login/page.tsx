"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
export default function LoginPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  async function signIn() {
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setMessage("Sign-in could not start. Please try again later.");
      setBusy(false);
    }
  }
  return (
    <section className="account-page">
      <p className="eyebrow account-kicker">WELCOME TO THE LISTENING PARTY</p>
      <h1>
        Good taste.
        <br />
        Better together.
      </h1>
      <p>
        Sign in to publish AI mixtape notes, vote on the community’s B-sides,
        and make this corner of the city yours.
      </p>
      <button type="button" onClick={signIn} disabled={busy || !configured}>
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {!configured && (
        <p>
          Sign-in is getting connected. The record collection is open to
          everyone.
        </p>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
      <Link href="/">Back to the collection →</Link>
    </section>
  );
}
