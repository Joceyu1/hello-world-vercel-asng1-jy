"use client";
import ArrowIcon from "@/app/components/arrow-icon";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { artists } from "@/lib/music/artists";
import type { FeedNote } from "@/lib/music/feed";
import { submitVote } from "@/app/actions/studio";
function NoteCard({ note, signedIn }: { note: FeedNote; signedIn: boolean }) {
  const [message, setMessage] = useState("");
  const [vote, setVote] = useState<number | null>(note.ownVote);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const artist = artists.find((a) => a.id === note.artist_id);
  function cast(value: number) {
    startTransition(async () => {
      try {
        const result = await submitVote(note.id, value);
        setMessage(result.message);
        if (result.ok) {
          setVote(value);
          router.refresh();
        }
      } catch {
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
        <div className="vote-controls">
          <button
            type="button"
            aria-label={`Upvote ${note.title}`}
            aria-pressed={recordedVote === 1}
            disabled={!signedIn || pending || recordedVote !== null}
            onClick={() => cast(1)}
          >
            ↑ <span>{note.upvotes}</span>
          </button>
          <button
            type="button"
            aria-label={`Downvote ${note.title}`}
            aria-pressed={recordedVote === -1}
            disabled={!signedIn || pending || recordedVote !== null}
            onClick={() => cast(-1)}
          >
            ↓ <span>{note.downvotes}</span>
          </button>
        </div>
        <span>
          {recordedVote !== null ? (
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
      <p className="vote-message" role="status" aria-live="polite">
        {message}
      </p>
    </article>
  );
}
export default function Wall({
  notes,
  signedIn,
  issue,
}: {
  notes: FeedNote[];
  signedIn: boolean;
  issue: string | null;
}) {
  const [sort, setSort] = useState("Fresh drops");
  const sorted = [...notes].sort((a, b) =>
    sort === "Crowd favorites"
      ? b.score - a.score || b.created_at.localeCompare(a.created_at)
      : b.created_at.localeCompare(a.created_at),
  );
  return (
    <section id="wall" className="section wall">
      <div className="section-heading">
        <div>
          <p className="eyebrow">03 / THE COMMUNITY WALL</p>
          <h2>Good taste is a team sport.</h2>
        </div>
        <p>
          Fresh ideas. Honest votes.
          <br />
          Help the best B-sides rise.
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
          Latest 60 notes · {notes.length} on the wall
        </span>
      </div>
      {issue ? (
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
    </section>
  );
}
