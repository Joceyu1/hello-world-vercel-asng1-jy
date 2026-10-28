"use client";
import ArrowIcon from "@/app/components/arrow-icon";
import ArtistPortrait from "@/app/components/artist-portrait";
import TrackLinks from "./track-links";
import GenreTabs, { useGenre } from "./genre-tabs";
import { useState, type CSSProperties } from "react";
import {
  artists,
  artistLinks,
  genres,
  genreDescriptions,
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
  const genreGroups = genres
    .filter((name) => genre === "All sounds" || genre === name)
    .map((name) => ({ name, artists: filtered.filter((artist) => artist.genre === name) }))
    .filter((group) => group.artists.length > 0);
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
      <div className="genre-sections">
        {genreGroups.map((group) => (
          <section className="genre-section" key={group.name} aria-labelledby={`genre-heading-${genres.indexOf(group.name)}`}>
            <header className="genre-introduction">
              <div>
                <p className="eyebrow">KNOW THE SOUND</p>
                <h3 id={`genre-heading-${genres.indexOf(group.name)}`}>{group.name}</h3>
              </div>
              <p>{genreDescriptions[group.name]}</p>
            </header>
            <div className="artist-grid">
              {group.artists.map((artist) => (
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
                    <h4>{artist.name}</h4>
                    <p>{artist.bio}</p>
                    <div className="artist-discovery-links">
                      {artistLinks(artist).map(({ platform, href }) => (
                        <a
                          key={platform}
                          className="artist-discography"
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={platform === "Last.fm"
                            ? `Explore ${artist.name}'s discography on Last.fm (opens a new tab)`
                            : `Search for ${artist.name} on ${platform} (opens a new tab)`}
                        >
                          {platform === "Last.fm" ? "Explore discography on Last.fm" : platform}{" "}
                          <ArrowIcon />
                        </a>
                      ))}
                    </div>
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
          </section>
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
