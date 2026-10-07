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
const { artists, spotifySearch } = require(join(out, "artists.js"));
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
test("catalog contains ten distinct artists and ten tracks per artist", () => {
  assert.equal(artists.length, 10);
  assert.equal(new Set(artists.map((a) => a.id)).size, 10);
  for (const a of artists) {
    assert.equal(a.songs.length, 10);
    assert.equal(new Set(a.songs).size, 10);
  }
});
test("Spotify links encode artist and track rather than fabricate track IDs", () => {
  const link = new URL(spotifySearch("A Tribe Called Quest", "Can I Kick It?"));
  assert.equal(link.hostname, "open.spotify.com");
  assert.equal(
    decodeURIComponent(link.pathname),
    "/search/A Tribe Called Quest Can I Kick It?",
  );
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
