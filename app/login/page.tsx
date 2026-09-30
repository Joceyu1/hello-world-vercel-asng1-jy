"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    async function signIn() {
        setBusy(true);
        setMessage("");

        const supabase = createClient();

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setMessage(error.message);
            setBusy(false);
        }
    }

    return (
        <main>
            <h1>Log in</h1>
            <p>Sign in to manage your profile and access the members page.</p>

            <button onClick={signIn} disabled={busy}>
                {busy ? "Redirecting…" : "Continue with Google"}
            </button>

            <p role="status">{message}</p>
        </main>
    );
}