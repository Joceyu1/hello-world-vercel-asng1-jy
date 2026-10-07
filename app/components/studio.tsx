"use client";
import ArrowIcon from "@/app/components/arrow-icon";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { artists } from "@/lib/music/artists";
import { moods, scenes } from "@/lib/music/prompt";
import { publishNote } from "@/app/actions/studio";
export default function Studio({ signedIn }: { signedIn: boolean }) {
  const [artistId, setArtistId] = useState("tribe");
  const [mood, setMood] = useState<string>(moods[0]);
  const [scene, setScene] = useState<string>(scenes[0]);
  const [idea, setIdea] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    startTransition(async () => {
      try {
        const result = await publishNote({ artistId, mood, scene, idea });
        setMessage(result.message);
        setSuccess(result.ok);
        if (result.ok) {
          setIdea("");
          router.refresh();
        }
      } catch {
        setMessage("The studio lost its connection. Please try again.");
      }
    });
  }
  return (
    <section id="studio" className="section studio">
      <div className="studio-intro">
        <p className="eyebrow">02 / THE AI MIXTAPE STUDIO</p>
        <h2>
          Your weekend.
          <br />A new B-side.
        </h2>
        <p>
          Pick a sound. Set a scene. Make an original AI-written liner note for
          your next city adventure.
        </p>
        <div className="cassette" aria-hidden="true">
          <div className="cassette-label">
            <span>SIDE B</span>
            <span>YOUR CITY / YOUR SOUND</span>
          </div>
          <div className="cassette-window">
            <span />
            <i />
            <span />
          </div>
          <div className="cassette-bottom">90 MIN · HIGH BIAS · STEREO</div>
        </div>
        <p className="studio-fine">
          Original words, real musical inspiration.
          <br />
          No copied lyrics. No pretend event listings.
        </p>
      </div>
      <form className="studio-form" onSubmit={submit}>
        <div className="form-heading">
          <span className="live-dot" /> RECORD SOMETHING NEW
        </div>
        <fieldset disabled={!signedIn || pending} aria-busy={pending}>
          <label htmlFor="artist">01 — Choose your inspiration</label>
          <select
            id="artist"
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
          >
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.genre}
              </option>
            ))}
          </select>
          <div className="form-columns">
            <div>
              <label htmlFor="mood">02 — Set the mood</label>
              <select
                id="mood"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
              >
                {moods.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="scene">03 — Pick a city scene</label>
              <select
                id="scene"
                value={scene}
                onChange={(e) => setScene(e.target.value)}
              >
                {scenes.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <label htmlFor="idea">
            04 — Add your spin <span>(optional)</span>
          </label>
          <textarea
            id="idea"
            placeholder="A sunny walk after a long week of midterms…"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            maxLength={240}
            rows={3}
          />
          <div className="input-hint">
            <span>
              Your note and full prompt will be public. Leave out personal
              details.
            </span>
            <span>{idea.length}/240</span>
          </div>
          {signedIn && (
            <button
              className="button button-lime generate-button"
              type="submit"
            >
              {pending ? "Recording your B-side…" : "Generate & publish a note"}
              <span aria-hidden="true">
                <ArrowIcon />
              </span>
            </button>
          )}
        </fieldset>
        {!signedIn && (
          <Link className="button button-lime generate-button" href="/login">
            Sign in to start creating{" "}
            <span aria-hidden="true">
              <ArrowIcon />
            </span>
          </Link>
        )}
        <p className="form-footnote">
          Five attempts per day, including failed requests. Resets at midnight
          UTC. Published notes go straight to the community wall.
        </p>
        <p
          className={success ? "form-message success" : "form-message"}
          role="status"
          aria-live="polite"
        >
          {pending
            ? "Making your note. This can take up to a minute. Keep this page open."
            : message}
          {success && (
            <>
              {" "}
              <a href="#wall">See your note →</a>
            </>
          )}
        </p>
      </form>
    </section>
  );
}
