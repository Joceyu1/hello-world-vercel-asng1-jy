"use client";
import ArrowIcon from "@/app/components/arrow-icon";
import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { artists, spotifySearch } from "@/lib/music/artists";
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
          Ten artists. A hundred essentials.
          <br />
          Find your next repeat listen.
        </p>
      </div>
      <div className="catalog-controls">
        <div className="filter-tabs" aria-label="Filter artists">
          {["All sounds", "Hip hop", "New jack swing", "Rave"].map((g) => (
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
            placeholder="Find an artist or track…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <p className="catalog-note">
        Curated essentials, including later 90s favorites. Spotify links open
        search results; these are not live popularity rankings.
      </p>
      <div className="artist-grid">
        {filtered.map((artist) => (
          <article
            className="artist-card"
            key={artist.id}
            style={{ "--record-color": artist.color } as CSSProperties}
          >
            <div className={`record-art art-${artist.id}`} aria-hidden="true">
              <Image
                src={`/images/side-b-${artist.genre === "Rave" ? "la" : artist.genre === "New jack swing" ? "atl" : "nyc"}.png`}
                alt=""
                fill
                sizes="(max-width: 540px) 88vw, (max-width: 800px) 43vw, 29vw"
                className="artist-street-photo"
                style={{ objectFit: "cover" }}
              />
              <span className="record-code">
                SIDE B / {String(artists.indexOf(artist) + 1).padStart(2, "0")}
              </span>
              <div className="mini-vinyl">
                <span>
                  {artist.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 4)}
                </span>
              </div>
              <span className="record-genre">{artist.genre}</span>
            </div>
            <div className="artist-info">
              <div className="artist-meta">
                <span>{artist.hometown}</span>
                <span>{artist.years}</span>
              </div>
              <h3>{artist.name}</h3>
              <p>{artist.bio}</p>
              <details>
                <summary>
                  10 essential tracks{" "}
                  <span aria-hidden="true">
                    <ArrowIcon />
                  </span>
                </summary>
                <ol className="track-list">
                  {artist.songs.map((song, index) => (
                    <li key={song}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <a
                        href={spotifySearch(artist.name, song)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Find ${song} by ${artist.name} on Spotify (opens a new tab)`}
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
