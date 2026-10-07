import ArrowIcon from "@/app/components/arrow-icon";
import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource/anton/latin-400.css";
import "@fontsource/space-mono/latin-400.css";
import "@fontsource/space-mono/latin-700.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "SIDE B — Old school. New energy.",
  description:
    "A 90s-inspired music discovery club. Explore hip hop, new jack swing, and rave essentials; create AI mixtape notes and vote on your favorites.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <Link href="/" className="wordmark" aria-label="Side B home">
            SIDE<span>B</span>
            <i>®</i>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/#collection">The collection</Link>
            <Link href="/#studio">AI studio</Link>
            <Link href="/#wall">Community</Link>
          </nav>
          <Link href="/profile" className="header-account">
            Your profile{" "}
            <span aria-hidden="true">
              <ArrowIcon />
            </span>
          </Link>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <Link href="/" className="wordmark">
            SIDE<span>B</span>
            <i>®</i>
          </Link>
          <p>ROOTED IN THE 90s. TUNED INTO TODAY.</p>
          <div>
            <Link href="/login">Sign in</Link>
            <Link href="/profile">Profile</Link>
            <a
              href="https://open.spotify.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Spotify <ArrowIcon />
            </a>
          </div>
          <small>
            An independent music discovery project. Not affiliated with Spotify
            or the featured artists.
          </small>
        </footer>
      </body>
    </html>
  );
}
