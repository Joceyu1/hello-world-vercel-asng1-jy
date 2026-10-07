"use client";

import Image from "next/image";
import { useState } from "react";
import { artistPhotos } from "@/lib/music/artist-photos";

export default function ArtistPortrait({
  artistId,
  name,
  genre,
  number,
}: {
  artistId: string;
  name: string;
  genre: string;
  number: number;
}) {
  const entry = artistPhotos[artistId];
  const [imageIndex, setImageIndex] = useState(0);
  const photo =
    imageIndex === 0 ? entry : imageIndex === 1 ? entry?.fallback : undefined;
  const credit = photo ?? entry;
  return (
    <>
      <div className={`record-art art-${artistId}`}>
        {photo ? (
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(max-width: 540px) 88vw, (max-width: 800px) 43vw, 29vw"
            className="artist-portrait"
            style={{
              objectFit: photo.fit ?? "cover",
              objectPosition: photo.position,
            }}
            onError={() => setImageIndex((current) => current + 1)}
          />
        ) : (
          <div className="portrait-placeholder">
            <span>{name}</span>
            <small>Artist photo unavailable</small>
          </div>
        )}
        <span className="record-code">
          SIDE B / {String(number).padStart(2, "0")}
        </span>
        <span className="record-genre">{genre}</span>
      </div>
      {credit && (
        <div className="photo-credit">
          <span className="photo-caption">{credit.caption}</span>
          <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">
            {credit.kind === "sleeve"
              ? "Sleeve"
              : credit.kind === "video"
                ? "Video still"
                : "Photo"}
            : {credit.credit}
          </a>
          {credit.license && (
            <>
              <span aria-hidden="true"> · </span>
              {credit.licenseUrl ? (
                <a
                  href={credit.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {credit.license}
                </a>
              ) : (
                <span>{credit.license}</span>
              )}
            </>
          )}
          {credit.fit !== "contain" && <span> · Cropped to fit</span>}
        </div>
      )}
    </>
  );
}
