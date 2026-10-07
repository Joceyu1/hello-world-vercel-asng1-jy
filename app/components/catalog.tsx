"use client";
import ArrowIcon from "@/app/components/arrow-icon";
import ArtistPortrait from "@/app/components/artist-portrait";
import { useState, type CSSProperties } from "react";
import {
  artists,
  genres,
  trackSearch,
  trackPlatformLabel,
} from "@/lib/music/artists";

const trackCount = artists.reduce(
  (total, artist) => total + artist.songs.length,
  0,
);

export default function Catalog() {
  const [genre, setGenre] = useState("All sounds");
  const [search, setSearch] = useState("");
  const filtered = artists.filter(
    (a) =>
      (genre === "All sounds" || a.genre === genre) &&
      `${a.name} ${a.hometown} ${a.songs.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section id="collection" className="section collection">
      <div className="section-heading">
        <div>
          <p className="eyebrow">01 / THE RECORD COLLECTION</p>
          <h2>
            Crate-digging.
            <br />
            <span className="street-accent">No gatekeeping.</span>
          </h2>
        </div>
        <p>
          {artists.length} artists. {trackCount} essentials.{" "}
          <br />
          Find your next repeat listen.
        </p>
      </div>
      <div className="catalog-controls">
        <div
          className="filter-tabs"
          role="group"
          aria-label="Filter artists by genre"
        >
          {["All sounds", ...genres].map((g) => (
            <button
              type="button"
              key={g}
              aria-pressed={genre === g}
              onClick={() => setGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>
        <label className="search-box">
          <span className="sr-only">Search artists or songs</span>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Find an artist or track…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <p className="catalog-note">
        Hand-picked essentials from the late 80s and 90s, with a few later
        favorites. Spotify and YouTube links open search results; these are not
        live popularity rankings. Artist photographs may be from later years.
      </p>
      <p
        className="catalog-results"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {filtered.length} of {artists.length} artists
        {genre !== "All sounds" ? ` · ${genre}` : " · All sounds"}
        {search.trim() ? ` · Matching “${search.trim()}”` : ""}
      </p>
      <div className="artist-grid">
        {filtered.map((artist) => (
          <article
            className="artist-card"
            key={artist.id}
            style={{ "--record-color": artist.color } as CSSProperties}
          >
            <ArtistPortrait
              artistId={artist.id}
              name={artist.name}
              genre={artist.genre}
              number={artists.indexOf(artist) + 1}
            />
            <div className="artist-info">
              <div className="artist-meta">
                <span>{artist.hometown}</span>
                <span>{artist.years}</span>
              </div>
              <h3>{artist.name}</h3>
              <p>{artist.bio}</p>
              <details>
                <summary>
                  {artist.songs.length} essential tracks
                  {artist.trackPlatform === "youtube" ? " · YouTube" : ""}{" "}
                  <span aria-hidden="true">
                    <ArrowIcon />
                  </span>
                </summary>
                <ol className="track-list">
                  {artist.songs.map((song, index) => (
                    <li key={song}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <a
                        href={trackSearch(artist, song)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Find ${song} by ${artist.name} on ${trackPlatformLabel(artist)} (opens a new tab)`}
                      >
                        {song}
                        <span aria-hidden="true">
                          <ArrowIcon />
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <p className="empty-state">
          No records match that search. Try another artist or song.
        </p>
      )}
    </section>
  );
}
