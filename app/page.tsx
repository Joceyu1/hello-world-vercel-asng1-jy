import ArrowIcon from "@/app/components/arrow-icon";
import Link from "next/link";
import Image from "next/image";
import CityScenes from "./components/city-scenes";
import Catalog from "./components/catalog";
import Studio from "./components/studio";
import Wall from "./components/wall";
import { getFeed } from "@/lib/music/feed";
import {
  artists,
  genres,
  getDailyArtist,
  trackSearch,
  trackPlatformLabel,
} from "@/lib/music/artists";
export const dynamic = "force-dynamic";
// Leave time around the 45-second AI deadline for authentication and saving.
export const maxDuration = 60;
const trackCount = artists.reduce(
  (total, artist) => total + artist.songs.length,
  0,
);
export default async function Home() {
  const { notes, signedIn, issue } = await getFeed();
  const dailyArtist = getDailyArtist();
  return (
    <>
      <section className="hero">
        <div className="hero-photo-background" aria-hidden="true">
          <Image
            src="/images/side-b-nyc.png"
            alt=""
            fill
            sizes="100vw"
            preload
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="live-dot" /> NYC / LA / ATL · STREET SOUL, CIRCA
            THE 90s
          </p>
          <h1 className="street-lettering">
            Off the wall.
            <br />
            <span>On repeat.</span>
          </h1>
          <p className="hero-description">
            Graffiti on the walls. Bass down the block.
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
              <strong>{artists.length}</strong> ARTISTS
            </span>
            <span>
              <strong>{trackCount}</strong> ESSENTIAL TRACKS
            </span>
            <span>
              <strong>∞</strong> NEW INSPIRATION
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="street-poster">
            <p className="poster-kicker">FOUND ON THE BLOCK / VOL. 002</p>
            <div className="street-photo-card city-nyc">
              <Image
                src="/images/side-b-nyc.png"
                alt=""
                fill
                sizes="(max-width: 540px) 64vw, 24vw"
                style={{ objectFit: "cover" }}
              />
              <span className="photo-city-tag">NYC / CONCRETE SOUL</span>
            </div>
            <div className="street-photo-card city-la">
              <Image
                src="/images/side-b-la.png"
                alt=""
                fill
                sizes="(max-width: 540px) 53vw, 20vw"
                style={{ objectFit: "cover" }}
              />
              <span className="photo-city-tag">LA / WEST COAST COLOR</span>
            </div>
            <div className="street-photo-card city-atl">
              <Image
                src="/images/side-b-atl.png"
                alt=""
                fill
                sizes="(max-width: 540px) 55vw, 20vw"
                style={{ objectFit: "cover" }}
              />
              <span className="photo-city-tag">ATL / SOUTHERN SWING</span>
            </div>
            <div className="poster-stamp">
              NO SKIPS.
              <br />
              ALL SOUL.
            </div>
            <span className="poster-scribble">
              meet me at the wall <ArrowIcon />
            </span>
          </div>
        </div>
      </section>
      <div className="genre-strip">
        {genres.map((genre) => (
          <span className="genre-strip-item" key={genre}>
            {genre} <b aria-hidden="true">✳</b>
          </span>
        ))}
      </div>
      <CityScenes />
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
          href={trackSearch(dailyArtist, dailyArtist.songs[0])}
          target="_blank"
          rel="noopener noreferrer"
        >
          Find on {trackPlatformLabel(dailyArtist)}{" "}
          <span aria-hidden="true">
            <ArrowIcon />
          </span>
        </a>
      </div>
      <Catalog />
      <Studio signedIn={signedIn} />
      <Wall notes={notes} signedIn={signedIn} issue={issue} />
      <section className="closing">
        <div className="closing-photo-background" aria-hidden="true">
          <Image
            src="/images/side-b-atl.png"
            alt=""
            fill
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        </div>
        <span className="eyebrow">FROM THE BLOCK TO YOUR NEXT B-SIDE.</span>
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
