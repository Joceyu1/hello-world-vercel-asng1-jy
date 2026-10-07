import ArrowIcon from "@/app/components/arrow-icon";
import Link from "next/link";
import Catalog from "./components/catalog";
import Studio from "./components/studio";
import Wall from "./components/wall";
import { getFeed } from "@/lib/music/feed";
import { getDailyArtist, spotifySearch } from "@/lib/music/artists";
export const dynamic = "force-dynamic";
export default async function Home() {
  const { notes, signedIn, issue } = await getFeed();
  const dailyArtist = getDailyArtist();
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="live-dot" /> NYC ROOTS. 90s SOUL. NEW FREQUENCIES.
          </p>
          <h1>
            Old school.
            <br />
            <span>New energy.</span>
          </h1>
          <p className="hero-description">
            From Queens beats to warehouse bass.
            <br />
            Dig into the 90s, make a mixtape moment,
            <br className="desktop-break" /> and let the crowd decide what hits.
          </p>
          <div className="hero-actions">
            <a className="button button-lime" href="#collection">
              Dig into the collection{" "}
              <span aria-hidden="true">
                <ArrowIcon />
              </span>
            </a>
            <a className="button button-outline" href="#studio">
              Make a B-side <span aria-hidden="true">＋</span>
            </a>
          </div>
          <div className="hero-stats">
            <span>
              <strong>10</strong> ARTISTS
            </span>
            <span>
              <strong>100</strong> ESSENTIAL TRACKS
            </span>
            <span>
              <strong>∞</strong> NEW INSPIRATION
            </span>
          </div>
        </div>
        <div
          className="hero-art"
          aria-label="Decorative vinyl record and mixtape sleeve"
        >
          <div className="orbit-text" aria-hidden="true">
            HIP HOP • NEW JACK SWING • RAVE •
          </div>
          <div className="hero-vinyl" aria-hidden="true">
            <div className="vinyl-center">
              <span>SIDE B</span>
              <strong>90</strong>
              <span>33⅓ RPM / STEREO</span>
              <i />
            </div>
          </div>
          <div className="record-sleeve" aria-hidden="true">
            <span>
              THE CITY
              <br />
              IS YOUR
              <br />
              DANCE FLOOR.
            </span>
            <div className="sleeve-footer">
              VOL. 001{" "}
              <b>
                <ArrowIcon />
              </b>
            </div>
          </div>
          <div className="hero-sticker" aria-hidden="true">
            NO SKIPS.
            <br />
            JUST VIBES.
          </div>
        </div>
      </section>
      <div className="genre-strip">
        <span>HIP HOP</span>
        <b>✳</b>
        <span>NEW JACK SWING</span>
        <b>✳</b>
        <span>RAVE CULTURE</span>
        <b>✳</b>
        <span>MADE FOR YOUR NEXT CHAPTER</span>
        <b>✳</b>
      </div>
      <div className="daily-drop">
        <div>
          <span className="eyebrow">TODAY’S NEEDLE DROP</span>
          <p>
            <strong>{dailyArtist.songs[0]}</strong>
            <span> / {dailyArtist.name}</span>
          </p>
        </div>
        <span className="daily-description">
          A daily rotation from the collection. Come back for a new pick.
        </span>
        <a
          href={spotifySearch(dailyArtist.name, dailyArtist.songs[0])}
          target="_blank"
          rel="noopener noreferrer"
        >
          Find on Spotify{" "}
          <span aria-hidden="true">
            <ArrowIcon />
          </span>
        </a>
      </div>
      <Catalog />
      <Studio signedIn={signedIn} />
      <Wall notes={notes} signedIn={signedIn} issue={issue} />
      <section className="closing">
        <span className="eyebrow">PASS THE AUX. KEEP THE CULTURE MOVING.</span>
        <h2>
          The next great B-side
          <br />
          could be yours.
        </h2>
        <Link
          className="button button-lime"
          href={signedIn ? "/#studio" : "/login"}
        >
          {signedIn ? "Back to the studio" : "Join the listening party"}{" "}
          <ArrowIcon />
        </Link>
      </section>
    </>
  );
}
