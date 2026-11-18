"use client";
import ArrowIcon from "@/app/components/arrow-icon";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { artists } from "@/lib/music/artists";
import type { Feed, FeedNote } from "@/lib/music/feed-data";
import { getBrowserFeed } from "@/lib/music/browser-feed";
import { submitVote } from "@/app/actions/studio";
import { NoteSkeletons, Spinner } from "@/app/components/feedback";
function NoteCard({ note, signedIn }: { note: FeedNote; signedIn: boolean }) {
  const [message, setMessage] = useState("");
  const [vote, setVote] = useState<number | null>(note.ownVote);
  const [outcome, setOutcome] = useState<"success" | "error" | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const artist = artists.find((a) => a.id === note.artist_id);
  function cast(value: number) {
    if (!signedIn || pending) return;
    setMessage("");
    setOutcome(null);
    startTransition(async () => {
      try {
        const result = await submitVote(note.id, value);
        setMessage(result.message);
        setOutcome(result.ok ? "success" : "error");
        if (result.ok) {
          setVote(value);
          router.refresh();
        }
      } catch {
        setOutcome("error");
        setMessage("Your vote could not be saved. Please try again.");
      }
    });
  }
  const recordedVote = vote ?? note.ownVote;
  return (
    <article className="note-card">
      <div className="note-meta">
        <span>AI LINER NOTE</span>
        <time dateTime={note.created_at}>
          {new Date(note.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })}
        </time>
      </div>
      <h3>{note.title}</h3>
      <p className="note-caption">{note.caption}</p>
      <div className="note-tags">
        <span>{artist?.name ?? "Mixtape"}</span>
        <span>{note.scene}</span>
      </div>
      <details className="prompt-details">
        <summary>
          Behind the prompt <span aria-hidden="true">+</span>
        </summary>
        <p>
          Generated with {note.model}. AI can get things wrong; this is creative
          writing, not a guide to live events.
        </p>
        <pre>{note.prompt}</pre>
      </details>
      <div className="vote-bar">
        <div className="vote-controls" aria-busy={pending}>
          <button
            type="button"
            aria-label={`Upvote ${note.title}`}
            aria-pressed={recordedVote === 1}
            disabled={!signedIn || pending || recordedVote === 1}
            onClick={() => cast(1)}
          >
            ↑ <span>{note.upvotes}</span>
          </button>
          <button
            type="button"
            aria-label={`Downvote ${note.title}`}
            aria-pressed={recordedVote === -1}
            disabled={!signedIn || pending || recordedVote === -1}
            onClick={() => cast(-1)}
          >
            ↓ <span>{note.downvotes}</span>
          </button>
        </div>
        <span role="status" aria-live="polite" aria-atomic="true">
          {pending ? (
            <span className="vote-pending"><Spinner /> Saving vote…</span>
          ) : recordedVote !== null ? (
            "VOTE RECORDED"
          ) : signedIn ? (
            "ONE LISTENER, ONE VOTE"
          ) : (
            <Link href="/login">
              Sign in to vote <ArrowIcon />
            </Link>
          )}
        </span>
      </div>
      <p className={`vote-message ${!pending && message ? `action-feedback ${outcome === "success" ? "is-success" : "is-error"}` : ""}`} role="status" aria-live="polite" aria-atomic="true">
        {!pending && outcome === "success" && <span className="feedback-check" aria-hidden="true">✓</span>}
        {!pending && message}
      </p>
    </article>
  );
}
export default function Wall({
  notes: initialNotes,
  signedIn: initialSignedIn,
  issue: initialIssue,
}: {
  notes: FeedNote[];
  signedIn: boolean;
  issue: string | null;
}) {
  const [sort, setSort] = useState("Fresh drops");
  const [browserFeed, setBrowserFeed] = useState<{
    sourceNotes: FeedNote[];
    sourceSignedIn: boolean;
    sourceIssue: string | null;
    result: Feed;
  } | null>(null);
  const settled = browserFeed !== null &&
    browserFeed.sourceNotes === initialNotes &&
    browserFeed.sourceSignedIn === initialSignedIn &&
    browserFeed.sourceIssue === initialIssue;
  const refreshing = !settled;
  // Keep server-rendered content available immediately, then refresh through
  // browser-visible Supabase REST/RPC calls on mount and after server actions.
  useEffect(() => {
    let active = true;
    function complete(result: Feed) {
      if (active) setBrowserFeed({
        sourceNotes: initialNotes,
        sourceSignedIn: initialSignedIn,
        sourceIssue: initialIssue,
        result,
      });
    }
    getBrowserFeed().then(complete).catch(() => complete({
      notes: initialNotes,
      signedIn: initialSignedIn,
      issue: "The community wall could not refresh. Please try again.",
    }));
    return () => { active = false; };
  }, [initialNotes, initialSignedIn, initialIssue]);
  const { notes, signedIn, issue } = settled && browserFeed
    ? browserFeed.result
    : { notes: initialNotes, signedIn: initialSignedIn, issue: initialIssue };
  const sorted = [...notes].sort((a, b) =>
    sort === "Crowd favorites"
      ? b.score - a.score || b.created_at.localeCompare(a.created_at)
      : b.created_at.localeCompare(a.created_at),
  );
  return (
    <section id="wall" className="section wall">
      <div className="section-heading">
        <div>
          <p className="eyebrow">02 / THE COMMUNITY WALL · RATE THE B-SIDES</p>
          <h2>Good taste is a team sport.</h2>
        </div>
        <p>
          Read a note. Give it an upvote or downvote.
          <br />
          Sign in with Columbia Google to rate. One vote per note; change yours anytime.
        </p>
      </div>
      <div className="wall-controls">
        <div className="filter-tabs">
          {["Fresh drops", "Crowd favorites"].map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === sort}
              onClick={() => setSort(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="catalog-note">
          {refreshing && !notes.length ? "Loading latest notes…" : `Latest 60 notes · ${notes.length} on the wall`}
        </span>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true">
        {refreshing && (
          <p className="action-feedback is-pending">
            <Spinner /> {notes.length ? "Refreshing community notes and votes…" : "Loading community notes…"}
          </p>
        )}
      </div>
      <div aria-busy={refreshing}>
      {refreshing && !notes.length ? (
        <NoteSkeletons />
      ) : issue ? (
        <div className="empty-wall">
          <span aria-hidden="true">◎</span>
          <h3>The next drop is on its way.</h3>
          <p>{issue}</p>
        </div>
      ) : !notes.length ? (
        <div className="empty-wall">
          <span aria-hidden="true">◎</span>
          <h3>Every scene starts with a first record.</h3>
          <p>No notes yet. Create the first B-side and set the tone.</p>
          <a href="#studio" className="button button-outline">
            Head to the studio <ArrowIcon />
          </a>
        </div>
      ) : (
        <div className="wall-grid">
          {sorted.map((note) => (
            <NoteCard key={note.id} note={note} signedIn={signedIn} />
          ))}
        </div>
      )}
      </div>
    </section>
  );
}
