"use client";
import ArrowIcon from "@/app/components/arrow-icon";
import ArtistPortrait from "@/app/components/artist-portrait";
import TrackLinks from "./track-links";
import GenreTabs, { useGenre } from "./genre-tabs";
import { useState, type CSSProperties } from "react";
import {
  artists,
  artistDiscographyUrl,
} from "@/lib/music/artists";

const trackCount = artists.reduce(
  (total, artist) => total + artist.songs.length,
  0,
);

export default function Catalog() {
  const { genre } = useGenre();
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
          <p className="eyebrow">02 / THE RECORD COLLECTION</p>
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
        <GenreTabs variant="catalog" />
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
        favorites. Choose Spotify, YouTube, Apple Music, or Last.fm to explore
        each song. Links open searches or discovery pages; availability and playback
        depend on the service. Artist photographs may be from later years.
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
              <a
                className="artist-discography"
                href={artistDiscographyUrl(artist)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Explore ${artist.name}'s discography on Last.fm (opens a new tab)`}
              >
                Explore discography on Last.fm <ArrowIcon />
              </a>
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
                      <div className="track-details">
                        <span className="track-title">{song}</span>
                        <TrackLinks artist={artist} song={song} />
                      </div>
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
