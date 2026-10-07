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
async function expectProviderFailure(
  t,
  response,
  checks,
  prompt = "private prompt sentinel",
) {
  await withKey(async () => {
    t.mock.method(globalThis, "fetch", async () => response);
    const log = t.mock.method(console, "error", () => {});
    await assert.rejects(
      () => generateNote(prompt),
      (error) => {
        for (const check of checks) assert.match(error.message, check);
        assert.doesNotMatch(
          error.message,
          /test-only-key|private prompt sentinel|private provider sentinel/,
        );
        return true;
      },
    );
    assert.equal(log.mock.callCount(), 1);
    const logged = JSON.stringify(
      log.mock.calls.map(({ arguments: args }) => args),
    );
    assert.doesNotMatch(
      logged,
      /test-only-key|private prompt sentinel|private provider sentinel/,
    );
    const diagnostic = log.mock.calls[0].arguments.find(
      (argument) => argument && typeof argument === "object",
    );
    assert.ok(
      diagnostic,
      "Provider failures should produce a sanitized diagnostic",
    );
    assert.equal(diagnostic.httpStatus, response.status);
    assert.equal(diagnostic.model, "gemini-2.5-flash");
    assert.ok(
      Object.keys(diagnostic).every((key) =>
        ["httpStatus", "model", "providerStatus", "reason"].includes(key),
      ),
      "The diagnostic must not include raw provider content or request metadata",
    );
  });
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
test("private credentials and a configured model are trimmed before a request", async (t) => {
  await withKey(async () => {
    process.env.GEMINI_API_KEY = "  test-only-key\n";
    process.env.GEMINI_MODEL = "  gemini-2.5-flash-lite  ";
    t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.equal(
        new URL(url).pathname,
        "/v1beta/models/gemini-2.5-flash-lite:generateContent",
      );
      assert.equal(options.headers["x-goog-api-key"], "test-only-key");
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
    assert.equal(
      (await generateNote("A full test prompt")).model,
      "gemini-2.5-flash-lite",
    );
  });
});
test("an invalid API key receives a credential diagnosis and a safe reference", async (t) => {
  await expectProviderFailure(
    t,
    Response.json(
      {
        error: {
          status: "INVALID_ARGUMENT",
          message:
            "private provider sentinel test-only-key private prompt sentinel",
          details: [
            {
              "@type": "type.googleapis.com/google.rpc.ErrorInfo",
              reason: "API_KEY_INVALID",
              metadata: { key: "test-only-key" },
            },
          ],
        },
      },
      { status: 400 },
    ),
    [/key/i, /Reference: AI-400-API_KEY_INVALID/],
  );
});
test("a referrer-blocked key receives a permissions diagnosis", async (t) => {
  await expectProviderFailure(
    t,
    Response.json(
      {
        error: {
          status: "PERMISSION_DENIED",
          details: [
            {
              "@type": "type.googleapis.com/google.rpc.ErrorInfo",
              reason: "API_KEY_HTTP_REFERRER_BLOCKED",
            },
          ],
        },
      },
      { status: 403 },
    ),
    [/key|credentials/i, /Reference: AI-403-API_KEY_HTTP_REFERRER_BLOCKED/],
  );
});
test("an unavailable Gemini model receives a model diagnosis", async (t) => {
  await expectProviderFailure(
    t,
    Response.json(
      {
        error: { status: "NOT_FOUND", message: "private provider sentinel" },
      },
      { status: 404 },
    ),
    [/model/i, /Reference: AI-404-NOT_FOUND/],
  );
});
test("quota exhaustion receives a usage diagnosis without a fabricated generation", async (t) => {
  await expectProviderFailure(
    t,
    Response.json(
      {
        error: {
          status: "RESOURCE_EXHAUSTED",
          message: "private provider sentinel",
        },
      },
      { status: 429 },
    ),
    [/busy|quota|usage|limit/i, /Reference: AI-429-RESOURCE_EXHAUSTED/],
  );
});
test("an HTML provider outage becomes a safe diagnostic rather than a parse failure", async (t) => {
  await expectProviderFailure(
    t,
    new Response(
      "<html>private provider sentinel test-only-key private prompt sentinel</html>",
      { status: 503, headers: { "content-type": "text/html" } },
    ),
    [/unavailable|try again/i, /Reference: AI-503-UNKNOWN/],
  );
});
test("unknown provider reason, status, message, and metadata are never reflected or logged", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  await withKey(async () => {
    t.mock.method(globalThis, "fetch", async () =>
      Response.json(
        {
          error: {
            status: "test-only-key private prompt sentinel",
            message: "private provider sentinel",
            details: [
              {
                "@type": "type.googleapis.com/google.rpc.ErrorInfo",
                reason:
                  "private provider sentinel test-only-key private prompt sentinel",
                metadata: {
                  secret: "test-only-key",
                  userPrompt: "private prompt sentinel",
                },
              },
            ],
          },
        },
        { status: 400 },
      ),
    );
    await assert.rejects(
      () => generateNote("private prompt sentinel"),
      (error) => {
        assert.match(error.message, /Reference: AI-400-UNKNOWN/);
        assert.doesNotMatch(
          error.message,
          /test-only-key|private prompt sentinel|private provider sentinel/,
        );
        return true;
      },
    );
    assert.equal(log.mock.callCount(), 1);
    const logged = JSON.stringify(
      log.mock.calls.map(({ arguments: args }) => args),
    );
    assert.doesNotMatch(
      logged,
      /test-only-key|private prompt sentinel|private provider sentinel|userPrompt|secret/,
    );
  });
});
test("blocked responses do not produce a fabricated generation", async (t) => {
  await withKey(async () => {
    t.mock.method(globalThis, "fetch", async () =>
      Response.json({ candidates: [] }),
    );
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
test("a whitespace-only AI key is treated as missing without a provider request", async (t) => {
  await withKey(async () => {
    process.env.GEMINI_API_KEY = "  \n  ";
    const mock = t.mock.method(globalThis, "fetch", async () => {
      throw new Error("Must not call provider");
    });
    await assert.rejects(() => generateNote("prompt"), /not connected/);
    assert.equal(mock.mock.callCount(), 0);
  });
});
