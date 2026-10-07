import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
const out = mkdtempSync(join(tmpdir(), "side-b-gemini-"));
execFileSync("./node_modules/.bin/tsc", [
  "lib/music/gemini.ts",
  "--outDir",
  out,
  "--module",
  "commonjs",
  "--target",
  "es2022",
  "--skipLibCheck",
]);
// The Next.js build enforces the server-only boundary. This isolated Node
// harness has no browser bundle and replaces only that marker for testing.
mkdirSync(join(out, "node_modules/server-only"), { recursive: true });
writeFileSync(
  join(out, "node_modules/server-only/index.js"),
  "module.exports = {};",
);
const { generateNote } = createRequire(import.meta.url)(join(out, "gemini.js"));
after(() => rmSync(out, { recursive: true, force: true }));
async function withKey(callback) {
  const oldKey = process.env.GEMINI_API_KEY,
    oldModel = process.env.GEMINI_MODEL;
  process.env.GEMINI_API_KEY = "test-only-key";
  delete process.env.GEMINI_MODEL;
  try {
    await callback();
  } finally {
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = oldModel;
  }
}
test("Gemini request uses a private header and preserves the actual prompt and model", async (t) => {
  await withKey(async () => {
    t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.equal(new URL(url).searchParams.has("key"), false);
      assert.equal(options.headers["x-goog-api-key"], "test-only-key");
      const body = JSON.parse(options.body);
      assert.equal(body.contents[0].parts[0].text, "A full test prompt");
      assert.equal(body.generationConfig.thinkingConfig.thinkingBudget, 0);
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                { text: '{"title":"City rhythm","caption":"A new B-side."}' },
              ],
            },
          },
        ],
      });
    });
    assert.deepEqual(await generateNote("A full test prompt"), {
      title: "City rhythm",
      caption: "A new B-side.",
      model: "gemini-2.5-flash",
    });
  });
});
test("rate-limit and blocked responses do not produce a fabricated generation", async (t) => {
  await withKey(async () => {
    const mock = t.mock.method(
      globalThis,
      "fetch",
      async () => new Response("private provider error", { status: 429 }),
    );
    await assert.rejects(() => generateNote("prompt"), /busy/);
    mock.mock.mockImplementation(async () => Response.json({ candidates: [] }));
    await assert.rejects(() => generateNote("prompt"), /could not generate/);
  });
});
test("missing AI key prevents requests rather than producing placeholder output", async (t) => {
  const oldKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const mock = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Must not call provider");
  });
  try {
    await assert.rejects(() => generateNote("prompt"), /not connected/);
    assert.equal(mock.mock.callCount(), 0);
  } finally {
    if (oldKey !== undefined) process.env.GEMINI_API_KEY = oldKey;
  }
});
