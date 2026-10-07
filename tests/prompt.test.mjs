import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
const out = mkdtempSync(join(tmpdir(), "side-b-tests-"));
execFileSync("./node_modules/.bin/tsc", [
  "lib/music/artists.ts",
  "lib/music/prompt.ts",
  "--outDir",
  out,
  "--module",
  "commonjs",
  "--target",
  "es2022",
  "--skipLibCheck",
]);
const require = createRequire(import.meta.url);
const { artists, genres, spotifySearch, trackSearch, trackPlatformLabel } = require(
  join(out, "artists.js"),
);
const { buildPrompt, parseNote, validateInput } = require(
  join(out, "prompt.js"),
);
after(() => rmSync(out, { recursive: true, force: true }));
const input = {
  artistId: "tribe",
  mood: "Golden-hour stroll",
  scene: "Riverside Park",
  idea: "A study break with friends",
};
const newArtistIds = [
  "tlc",
  "xscape",
  "swv",
  "en-vogue",
  "jodeci",
  "hi-five",
  "la-boyz",
  "eyc",
  "bobby-brown",
  "inner-city",
  "underground-resistance",
  "mary-j-blige",
  "jeff-mills",
  "2-unlimited",
  "snap",
  "culture-beat",
  "real-mccoy",
  "dead-or-alive",
  "dave-rodgers",
  "sinitta",
];
test("catalog preserves the original artists and contains thirty distinct artists", () => {
  const originalIds = [
    "tribe",
    "de-la",
    "wu-tang",
    "nas",
    "guy",
    "bell-biv",
    "janet",
    "prodigy",
    "orbital",
    "808",
  ];
  assert.equal(artists.length, 30);
  assert.equal(new Set(artists.map((a) => a.id)).size, 30);
  assert.deepEqual(
    [...artists.map((a) => a.id)].sort(),
    [...originalIds, ...newArtistIds].sort(),
  );
});
test("catalog contains three hundred essentials and ten distinct tracks per artist", () => {
  assert.equal(artists.reduce((sum, a) => sum + a.songs.length, 0), 300);
  for (const a of artists) {
    const expected = 10;
    assert.equal(a.songs.length, expected, a.name);
    assert.equal(
      new Set(a.songs.map((song) => song.trim().toLowerCase())).size,
      expected,
      a.name,
    );
    assert.ok(a.songs.every((song) => song === song.trim() && song.length > 0));
  }
});
test("genre filters cover every catalog genre including the expanded dance and R&B sounds", () => {
  assert.deepEqual([...genres], [
    "Hip hop",
    "New jack swing",
    "R&B",
    "Techno",
    "Rave",
    "Eurodance",
    "Eurobeat / Hi-NRG",
  ]);
  assert.deepEqual(
    [...new Set(artists.map((a) => a.genre))].sort(),
    [...genres].sort(),
  );
});
test("Spotify links encode artist and track rather than fabricate track IDs", () => {
  const link = new URL(spotifySearch("A Tribe Called Quest", "Can I Kick It?"));
  assert.equal(link.hostname, "open.spotify.com");
  assert.equal(
    decodeURIComponent(link.pathname),
    "/search/A Tribe Called Quest Can I Kick It?",
  );
});
test("L.A. Boyz uses YouTube searches with the artist and user-curated Mandarin title", () => {
  const artist = artists.find((a) => a.id === "la-boyz");
  const link = new URL(trackSearch(artist, "That's The Way (就是這樣)"));
  assert.equal(artist.trackPlatform, "youtube");
  assert.equal(link.hostname, "www.youtube.com");
  assert.equal(link.pathname, "/results");
  assert.equal(
    link.searchParams.get("search_query"),
    "L.A. Boyz That's The Way (就是這樣)",
  );
  assert.equal(trackPlatformLabel(artist), "YouTube");
});
test("artists without a platform override retain Spotify search links", () => {
  const artist = artists.find((a) => a.id === "tribe");
  assert.equal(
    trackSearch(artist, "Can I Kick It?"),
    spotifySearch("A Tribe Called Quest", "Can I Kick It?"),
  );
  assert.equal(trackPlatformLabel(artist), "Spotify");
});
test("prompt retains input, real songs, and creative safety boundaries", () => {
  const prompt = buildPrompt(input);
  assert.match(prompt, /A Tribe Called Quest/);
  assert.match(prompt, /Riverside Park/);
  assert.match(prompt, /A study break with friends/);
  assert.match(prompt, /untrusted creative input/);
  assert.match(prompt, /No lyrics/);
  assert.match(prompt, /Electric Relaxation/);
});
test("every added artist is accepted by the studio and appears in its saved prompt", () => {
  for (const artistId of newArtistIds) {
    const generationInput = { ...input, artistId };
    const artist = validateInput(generationInput);
    assert.equal(artist.id, artistId);
    const prompt = buildPrompt(generationInput);
    assert.ok(prompt.includes(`Artist inspiration: ${artist.name} (${artist.genre}).`));
    assert.ok(prompt.includes(artist.songs[0]));
  }
});
test("invalid artist, mood, scene, null and overlong ideas are rejected", () => {
  for (const value of [
    null,
    { ...input, artistId: "missing" },
    { ...input, mood: "unknown" },
    { ...input, scene: "unknown" },
    { ...input, idea: "x".repeat(241) },
  ])
    assert.throws(() => validateInput(value));
});
test("AI response validation rejects invalid JSON, missing fields, and oversized output", () => {
  assert.deepEqual(
    parseNote(
      '{"title":" A little city rhythm ","caption":" An original note. "}',
    ),
    { title: "A little city rhythm", caption: "An original note." },
  );
  for (const text of [
    "not JSON",
    "null",
    "{}",
    '{"title":12,"caption":"okay"}',
    JSON.stringify({ title: "x".repeat(91), caption: "okay" }),
    JSON.stringify({ title: "okay", caption: "x".repeat(901) }),
    '{"title":" ","caption":"okay"}',
  ])
    assert.throws(() => parseNote(text), /The AI response was incomplete/);
});
