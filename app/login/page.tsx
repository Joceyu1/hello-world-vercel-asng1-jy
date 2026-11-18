"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/app/components/feedback";
import { createClient } from "@/lib/supabase/client";
export default function LoginPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const signingIn = useRef(false);
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  useEffect(() => {
    function restoreSignIn() {
      if (!signingIn.current) return;
      signingIn.current = false;
      setBusy(false);
      setMessage("Sign-in was not completed. Continue with Google to try again.");
    }
    function restorePage(event: PageTransitionEvent) {
      if (event.persisted) restoreSignIn();
    }
    // OAuth leaves this tab. Browser Back may restore the pending page from
    // the back/forward cache without mounting this component again.
    window.addEventListener("pageshow", restorePage);
    window.addEventListener("popstate", restoreSignIn);
    return () => {
      window.removeEventListener("pageshow", restorePage);
      window.removeEventListener("popstate", restoreSignIn);
    };
  }, []);

  async function signIn() {
    if (signingIn.current || !configured) return;
    signingIn.current = true;
    setBusy(true);
    setMessage("Opening Google sign-in in this tab. Choose your Columbia account to continue.");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // Show all Google accounts; the callback enforces Columbia access.
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch {
      signingIn.current = false;
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
        Sign in with your verified @columbia.edu Google account to publish AI mixtape notes, vote on the community’s B-sides,
        and make this corner of the city yours.
      </p>
      <button
        type="button"
        onClick={signIn}
        disabled={busy || !configured}
        aria-busy={busy}
        aria-describedby="sign-in-status"
      >
        {busy && <Spinner />}
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {!configured && (
        <p>
          Sign-in is getting connected. The record collection is open to
          everyone.
        </p>
      )}
      <p id="sign-in-status" role="status" aria-live="polite" aria-atomic="true">
        {message}
      </p>
      <Link href="/">Back to the collection →</Link>
    </section>
  );
}
