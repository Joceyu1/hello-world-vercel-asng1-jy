import { trackLinks, type Artist } from "@/lib/music/artists";

export default function TrackLinks({ artist, song }: { artist: Artist; song: string }) {
  return (
    <div className="track-platform-links" aria-label={`Find ${song} on a music service`}>
      {trackLinks(artist, song).map(({ platform, href }) => (
        <a
          key={platform}
          className="track-platform-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Search for ${song} by ${artist.name} on ${platform} (opens a new tab)`}
        >
          {platform} <span aria-hidden="true">↗</span>
        </a>
      ))}
    </div>
  );
}
