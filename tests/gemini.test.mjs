import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { setImmediate as nextTurn } from "node:timers/promises";
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
async function advanceRetryDelays(t, fetchMock, expectedAttempts) {
  await nextTurn();
  assert.equal(fetchMock.mock.callCount(), 1);
  t.mock.timers.tick(999);
  await nextTurn();
  assert.equal(fetchMock.mock.callCount(), 1);
  t.mock.timers.tick(1);
  await nextTurn();
  assert.equal(fetchMock.mock.callCount(), 2);
  if (expectedAttempts === 2) return;
  t.mock.timers.tick(1999);
  await nextTurn();
  assert.equal(fetchMock.mock.callCount(), 2);
  t.mock.timers.tick(1);
  await nextTurn();
  assert.equal(fetchMock.mock.callCount(), 3);
}
async function expectProviderFailure(
  t,
  response,
  checks,
  prompt = "private prompt sentinel",
  expectedAttempts = 1,
) {
  await withKey(async () => {
    if (expectedAttempts > 1) t.mock.timers.enable({ apis: ["setTimeout"] });
    let httpStatus;
    const fetchMock = t.mock.method(globalThis, "fetch", async (...args) => {
      const current =
        typeof response === "function" ? response(...args) : response;
      httpStatus = current.status;
      return current;
    });
    const log = t.mock.method(console, "error", () => {});
    const rejection = assert.rejects(
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
    if (expectedAttempts > 1)
      await advanceRetryDelays(t, fetchMock, expectedAttempts);
    await rejection;
    assert.equal(fetchMock.mock.callCount(), expectedAttempts);
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
    assert.equal(diagnostic.httpStatus, httpStatus);
    assert.equal(diagnostic.model, "gemini-3.5-flash-lite");
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
      assert.equal(
        new URL(url).pathname,
        "/v1beta/models/gemini-3.5-flash-lite:generateContent",
      );
      assert.equal(new URL(url).searchParams.has("key"), false);
      assert.equal(options.headers["x-goog-api-key"], "test-only-key");
      const body = JSON.parse(options.body);
      assert.equal(body.contents[0].parts[0].text, "A full test prompt");
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      assert.equal(body.generationConfig.maxOutputTokens, 2048);
      assert.deepEqual(body.generationConfig.responseSchema, {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          caption: { type: "STRING" },
        },
        required: ["title", "caption"],
      });
      assert.equal(Object.hasOwn(body.generationConfig, "temperature"), false);
      assert.deepEqual(body.generationConfig.thinkingConfig, {
        thinkingLevel: "MINIMAL",
      });
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
      model: "gemini-3.5-flash-lite",
    });
  });
});
test("an explicit Gemini 2.5 Flash override retains its supported sampling and thinking controls", async (t) => {
  await withKey(async () => {
    process.env.GEMINI_MODEL = "gemini-2.5-flash";
    t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.equal(
        new URL(url).pathname,
        "/v1beta/models/gemini-2.5-flash:generateContent",
      );
      const body = JSON.parse(options.body);
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      assert.equal(body.generationConfig.thinkingConfig.thinkingBudget, 0);
      assert.equal(body.generationConfig.temperature, 0.85);
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
      "gemini-2.5-flash",
    );
  });
});
test("an explicit Flash alias uses model defaults without assuming its resolved version", async (t) => {
  await withKey(async () => {
    process.env.GEMINI_MODEL = "gemini-flash-latest";
    t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.equal(
        new URL(url).pathname,
        "/v1beta/models/gemini-flash-latest:generateContent",
      );
      const body = JSON.parse(options.body);
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      assert.equal(Object.hasOwn(body.generationConfig, "temperature"), false);
      assert.equal(
        Object.hasOwn(body.generationConfig, "thinkingConfig"),
        false,
      );
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
      "gemini-flash-latest",
    );
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
    () =>
      new Response(
        "<html>private provider sentinel test-only-key private prompt sentinel</html>",
        { status: 503, headers: { "content-type": "text/html" } },
      ),
    [/unavailable|try again/i, /Reference: AI-503-UNKNOWN/],
    "private prompt sentinel",
    3,
  );
});
test("a temporary 503 retries the same request after one second and publishes the actual response", async (t) => {
  await withKey(async () => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const unavailable = Response.json(
      { error: { status: "UNAVAILABLE" } },
      { status: 503 },
    );
    const log = t.mock.method(console, "error", () => {});
    let firstUrl, firstOptions;
    const fetchMock = t.mock.method(
      globalThis,
      "fetch",
      async (url, options) => {
        if (!firstOptions) {
          firstUrl = url;
          firstOptions = options;
          return unavailable;
        }
        assert.equal(
          unavailable.bodyUsed,
          true,
          "The failed response body must be consumed or cancelled before retrying",
        );
        assert.equal(url, firstUrl);
        assert.equal(
          options,
          firstOptions,
          "Retries must preserve the complete request",
        );
        assert.equal(
          options.signal,
          firstOptions.signal,
          "Retries must share the original deadline",
        );
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
      },
    );
    const result = generateNote("A full test prompt");
    await advanceRetryDelays(t, fetchMock, 2);
    assert.deepEqual(await result, {
      title: "City rhythm",
      caption: "A new B-side.",
      model: "gemini-3.5-flash-lite",
    });
    assert.equal(fetchMock.mock.callCount(), 2);
    assert.equal(log.mock.callCount(), 0);
  });
});
test("persistent 503 responses stop after three attempts and keep the safe provider reference", async (t) => {
  const responses = [];
  let firstUrl, firstOptions;
  await expectProviderFailure(
    t,
    (url, options) => {
      if (responses.length) {
        assert.equal(
          responses.at(-1).bodyUsed,
          true,
          "The previous response body must be consumed or cancelled",
        );
        assert.equal(url, firstUrl);
        assert.equal(options, firstOptions);
        assert.equal(options.signal, firstOptions.signal);
      } else {
        firstUrl = url;
        firstOptions = options;
      }
      const response = Response.json(
        {
          error: {
            status: "UNAVAILABLE",
            message:
              "private provider sentinel test-only-key private prompt sentinel",
          },
        },
        { status: 503 },
      );
      responses.push(response);
      return response;
    },
    [/unavailable/i, /Reference: AI-503-UNAVAILABLE/],
    "private prompt sentinel",
    3,
  );
  assert.equal(responses.length, 3);
});
test("a quota response following a 503 stops retries immediately", async (t) => {
  let calls = 0;
  await expectProviderFailure(
    t,
    () => {
      calls += 1;
      return Response.json(
        {
          error: { status: calls === 1 ? "UNAVAILABLE" : "RESOURCE_EXHAUSTED" },
        },
        { status: calls === 1 ? 503 : 429 },
      );
    },
    [/Reference: AI-429-RESOURCE_EXHAUSTED/],
    "private prompt sentinel",
    2,
  );
  assert.equal(calls, 2);
});
test("thrown network errors are not retried", async (t) => {
  await withKey(async () => {
    const failure = new TypeError("fetch failed");
    const fetchMock = t.mock.method(globalThis, "fetch", async () => {
      throw failure;
    });
    await assert.rejects(
      () => generateNote("prompt"),
      (error) => error === failure,
    );
    assert.equal(fetchMock.mock.callCount(), 1);
  });
});
test("provider timeouts are not retried", async (t) => {
  await withKey(async () => {
    const failure = new DOMException("The operation timed out", "TimeoutError");
    const fetchMock = t.mock.method(globalThis, "fetch", async () => {
      throw failure;
    });
    await assert.rejects(
      () => generateNote("prompt"),
      (error) => error === failure,
    );
    assert.equal(fetchMock.mock.callCount(), 1);
  });
});
test("a valid provider response after 35 seconds finishes before the shared 45-second deadline", async (t) => {
  await withKey(async () => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const deadline = new AbortController();
    const timeoutMock = t.mock.method(AbortSignal, "timeout", (duration) => {
      assert.equal(duration, 45000);
      setTimeout(
        () =>
          deadline.abort(
            new DOMException("The operation timed out", "TimeoutError"),
          ),
        duration,
      );
      return deadline.signal;
    });
    const fetchMock = t.mock.method(globalThis, "fetch", async (_, options) => {
      assert.equal(options.signal, deadline.signal);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () =>
            resolve(
              Response.json({
                candidates: [
                  {
                    content: {
                      parts: [
                        {
                          text: '{"title":"City rhythm","caption":"A new B-side."}',
                        },
                      ],
                    },
                  },
                ],
              }),
            ),
          35000,
        );
        options.signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(options.signal.reason);
          },
          { once: true },
        );
      });
    });
    let settled = false;
    const outcome = generateNote("A full test prompt").then(
      (value) => {
        settled = true;
        return { value };
      },
      (error) => {
        settled = true;
        return { error };
      },
    );
    await nextTurn();
    t.mock.timers.tick(30000);
    await nextTurn();
    assert.equal(
      settled,
      false,
      "The old 30-second deadline must not abort this request",
    );
    assert.equal(deadline.signal.aborted, false);
    t.mock.timers.tick(5000);
    await nextTurn();
    const result = await outcome;
    assert.equal(result.error, undefined);
    assert.deepEqual(result.value, {
      title: "City rhythm",
      caption: "A new B-side.",
      model: "gemini-3.5-flash-lite",
    });
    assert.equal(timeoutMock.mock.callCount(), 1);
    assert.equal(fetchMock.mock.callCount(), 1);
  });
});
test("the shared 45-second deadline stops a stalled provider without extra attempts", async (t) => {
  await withKey(async () => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const failure = new DOMException("The operation timed out", "TimeoutError");
    const deadline = new AbortController();
    const timeoutMock = t.mock.method(AbortSignal, "timeout", (duration) => {
      assert.equal(duration, 45000);
      setTimeout(() => deadline.abort(failure), duration);
      return deadline.signal;
    });
    const fetchMock = t.mock.method(
      globalThis,
      "fetch",
      async (_, options) =>
        new Promise((_, reject) => {
          assert.equal(options.signal, deadline.signal);
          options.signal.addEventListener(
            "abort",
            () => reject(options.signal.reason),
            { once: true },
          );
        }),
    );
    let settled = false;
    const outcome = generateNote("prompt").then(
      (value) => {
        settled = true;
        return { value };
      },
      (error) => {
        settled = true;
        return { error };
      },
    );
    await nextTurn();
    t.mock.timers.tick(44999);
    await nextTurn();
    assert.equal(settled, false);
    t.mock.timers.tick(1);
    await nextTurn();
    assert.equal((await outcome).error, failure);
    assert.equal(timeoutMock.mock.callCount(), 1);
    assert.equal(fetchMock.mock.callCount(), 1);
  });
});
test("an expired shared deadline prevents a retry and retains the original timeout", async (t) => {
  await withKey(async () => {
    const failure = new DOMException("The operation timed out", "TimeoutError");
    const deadline = new AbortController();
    const timeoutMock = t.mock.method(AbortSignal, "timeout", (duration) => {
      assert.equal(duration, 45000);
      return deadline.signal;
    });
    const fetchMock = t.mock.method(globalThis, "fetch", async (_, options) => {
      assert.equal(options.signal, deadline.signal);
      deadline.abort(failure);
      return Response.json(
        { error: { status: "UNAVAILABLE" } },
        { status: 503 },
      );
    });
    await assert.rejects(
      () => generateNote("prompt"),
      (error) => error === failure,
    );
    assert.equal(timeoutMock.mock.callCount(), 1);
    assert.equal(fetchMock.mock.callCount(), 1);
  });
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
