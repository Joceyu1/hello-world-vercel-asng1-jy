import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(path, dependencies = {}, globals = {}) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", ...Object.keys(globals), source)((name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, compiledModule, compiledModule.exports, ...Object.values(globals));
  return compiledModule.exports;
}
const access = load("../lib/auth/columbia.ts");
const allowed = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "listener@columbia.edu", email_confirmed_at: "2026-10-14T00:00:00Z",
  app_metadata: { provider: "google" },
  identities: [{ provider: "google", identity_data: { email: "listener@columbia.edu", email_verified: true } }],
};
const denied = [
  null,
  { ...allowed, email: "listener@gmail.com" },
  { ...allowed, email: "listener@alumni.columbia.edu" },
  { ...allowed, email: "listener@columbia.edu.evil.test" },
  { ...allowed, email: "listener@evilcolumbia.edu" },
  { ...allowed, email: "listener@columbia.edu " },
  { ...allowed, email: "a@b@columbia.edu" },
  { ...allowed, email_confirmed_at: null },
  { ...allowed, identities: undefined },
  { ...allowed, app_metadata: { provider: "email", providers: ["google"] } },
  { ...allowed, identities: [{ provider: "email", identity_data: { email: allowed.email, email_verified: true } }] },
  { ...allowed, identities: [{ provider: "google", identity_data: { email: "other@columbia.edu", email_verified: true } }] },
  { ...allowed, identities: [{ provider: "google", identity_data: { email: allowed.email, email_verified: false } }] },
  { ...allowed, identities: [{ provider: "google", identity_data: { email: allowed.email, email_verified: "true" } }] },
  { ...allowed, identities: [], user_metadata: { email: allowed.email, email_verified: true, provider: "google" } },
];

test("only a confirmed exact Columbia email with matching verified Google identity qualifies", () => {
  assert.equal(access.isColumbiaGoogleUser(allowed), true);
  assert.equal(access.isColumbiaGoogleUser({ ...allowed, email: "LISTENER@COLUMBIA.EDU" }), true);
  for (const user of denied) assert.equal(access.isColumbiaGoogleUser(user), false);
});

class NextResponse extends Response {
  static redirect(url) { return new NextResponse(null, { status: 307, headers: { Location: url.toString() } }); }
}
function callbackHarness(user, options = {}) {
  const calls = [];
  const auth = {
    exchangeCodeForSession: async (code) => { calls.push(["exchange", code]); return { error: options.exchangeError }; },
    getUser: async () => { calls.push(["getUser"]); return { data: { user }, error: options.authError }; },
    signOut: async (scope) => { calls.push(["signOut", scope]); return { error: null }; },
  };
  const { GET } = load("../app/auth/callback/route.ts", {
    "next/server": { NextResponse },
    "@/lib/supabase/server": { createClient: async () => ({ auth }) },
    "@/lib/auth/columbia": access,
  });
  return { GET, calls };
}
test("OAuth callback signs out rejected identities and redirects to Access Denied", async () => {
  for (const user of denied) {
    const h = callbackHarness(user);
    const response = await h.GET(new Request("https://side-b.test/auth/callback?code=valid"));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("Location"), "https://side-b.test/access-denied");
    assert.match(response.headers.get("Cache-Control"), /no-store/);
    assert.deepEqual(h.calls, [["exchange", "valid"], ["getUser"], ["signOut", { scope: "local" }]]);
  }
});
test("OAuth callback accepts verified Columbia Google users and fails closed on authentication errors", async () => {
  const h = callbackHarness(allowed);
  const response = await h.GET(new Request("https://side-b.test/auth/callback?code=valid&next=https://evil.test"));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("Location"), "https://side-b.test/members");
  assert.match(response.headers.get("Cache-Control"), /no-store/);
  assert.deepEqual(h.calls, [["exchange", "valid"], ["getUser"]]);
  const failed = callbackHarness(allowed, { authError: new Error("Expired") });
  const failedResponse = await failed.GET(new Request("https://side-b.test/auth/callback?code=valid"));
  assert.equal(failedResponse.status, 307);
  assert.equal(failedResponse.headers.get("Location"), "https://side-b.test/access-denied");
  const badCode = callbackHarness(allowed, { exchangeError: new Error("Invalid code") });
  assert.equal((await badCode.GET(new Request("https://side-b.test/auth/callback?code=bad"))).status, 400);
  assert.deepEqual(badCode.calls, [["exchange", "bad"]]);
  assert.equal((await h.GET(new Request("https://side-b.test/auth/callback"))).status, 400);
});

const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
for (const page of ["profile", "members"]) {
  test(`${page} blocks existing personal sessions before reading any private data`, async () => {
    for (const user of [...denied, allowed]) {
      let reads = 0;
      const { default: Page } = load(`../app/${page}/page.tsx`, {
        "react/jsx-runtime": jsx,
        "next/link": { default: "Link" },
        "next/navigation": { redirect: (path) => { throw new Error(`redirect:${path}`); } },
        "./profile-form": { default: "ProfileForm" },
        "@/lib/auth/columbia": access,
        "@/lib/supabase/config": { isSupabaseConfigured: () => true },
        "@/lib/supabase/server": { createClient: async () => ({
          auth: { getUser: async () => ({ data: { user }, error: null }) },
          from: () => {
            reads++;
            const query = { select: () => query, eq: () => query,
              single: async () => ({ data: { first_name: "Columbia", last_name: "Listener" }, error: null }) };
            return query;
          },
        }) },
      });
      if (user === allowed) {
        assert.ok(await Page());
        assert.equal(reads, 1);
      } else {
        await assert.rejects(() => Page(), user ? /redirect:\/access-denied/ : /redirect:\/login/);
        assert.equal(reads, 0);
      }
    }
  });
}

test("personal sessions browse published notes and public totals as guests without reading ballots", async () => {
  for (const user of [...denied, allowed]) {
    const reads = [];
    const published = { id: "note", title: "Public note" };
    const { getFeed } = load("../lib/music/feed.ts", {
      "@/lib/auth/columbia": access,
      "@/lib/supabase/config": { isSupabaseConfigured: () => true },
      "@/lib/supabase/server": { createClient: async () => ({
        auth: { getUser: async () => ({ data: { user }, error: null }) },
        rpc: async () => ({ data: [{ generation_id: "note", score: 1, upvotes: 1, downvotes: 0 }], error: null }),
        from: (table) => {
          reads.push(table);
          const query = {
            select: () => query, eq: () => query, order: () => query, limit: () => query, in: () => query,
            then: (resolve) => resolve({ data: table === "generations" ? [published] : [{ generation_id: "note", value: 1 }], error: null }),
          };
          return query;
        },
      }) },
    });
    const feed = await getFeed();
    assert.equal(feed.signedIn, user === allowed);
    assert.equal(feed.issue, null);
    assert.equal(feed.notes[0].title, "Public note");
    assert.equal(feed.notes[0].score, 1);
    assert.equal(feed.notes[0].ownVote, user === allowed ? 1 : null);
    assert.deepEqual(reads, user === allowed ? ["generations", "votes"] : ["generations"]);
  }
});


test("Google sign-in offers the account chooser without a Columbia domain hint", async () => {
  let request;
  const { default: LoginPage } = load("../app/login/page.tsx", {
    "react/jsx-runtime": jsx,
    react: { useState: (initial) => [initial, () => {}] },
    "next/link": { default: "Link" },
    "@/lib/supabase/client": { createClient: () => ({ auth: {
      signInWithOAuth: async (options) => { request = options; return { error: null }; },
    } }) },
  }, {
    window: { location: { origin: "https://side-b.test" } },
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-public-key" } },
  });
  function findButton(node) {
    if (!node || typeof node !== "object") return undefined;
    if (node.type === "button") return node;
    for (const child of [node.props?.children].flat()) {
      const found = findButton(child);
      if (found) return found;
    }
  }
  const button = findButton(LoginPage());
  assert.equal(button.props.disabled, false);
  await button.props.onClick();
  assert.deepEqual(request, {
    provider: "google",
    options: { redirectTo: "https://side-b.test/auth/callback", queryParams: { prompt: "select_account" } },
  });
});
