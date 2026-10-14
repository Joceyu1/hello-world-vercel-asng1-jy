import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Access Denied — SIDE B",
  robots: { index: false, follow: false },
};

export default function AccessDeniedPage() {
  return (
    <section className="account-page access-denied-page" aria-labelledby="access-denied-title">
      <p className="eyebrow account-kicker">SIDE B / MEMBERS ONLY</p>
      <h1 id="access-denied-title">Access Denied</h1>
      <p>
        Sign in with a verified <strong>@columbia.edu Google account</strong> to
        create mixtape notes, vote, or access your profile. Other accounts
        cannot access these features.
      </p>
      <p>The record collection and community wall are still open to everyone.</p>
      <div className="access-denied-actions">
        <Link className="button button-lime" href="/login">
          Try your Columbia Google account →
        </Link>
        <Link href="/">Keep browsing the collection →</Link>
      </div>
    </section>
  );
}
