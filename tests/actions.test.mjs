import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Execute the actual action and prompt modules in isolated CommonJS contexts.
// The production build checks their types; only external boundaries are mocked
// here, so these tests never read credentials or call a live provider.
function compile(path) {
  return ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
}
function load(source, dependencies, environment = {}) {
  const compiledModule = { exports: {} };
  const requireMock = (name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected import: ${name}`);
    return dependencies[name];
  };
  new Function("require", "module", "exports", "process", source)(
    requireMock,
    compiledModule,
    compiledModule.exports,
    { env: environment },
  );
  return compiledModule.exports;
}
const artistsModule = load(compile("../lib/music/artists.ts"), {});
const promptModule = load(compile("../lib/music/prompt.ts"), {
  "./artists": artistsModule,
});
const actionSource = compile("../app/actions/studio.ts");
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const generationId = "33333333-3333-4333-8333-333333333333";
const input = {
  artistId: "tribe",
  mood: "Golden-hour stroll",
  scene: "Riverside Park",
  idea: "A sunny study break with friends",
};
const note = {
  title: "A new rhythm for your weekend",
  caption: "An original AI-written note for a riverside study break.",
  model: "test-model",
};

function harness(options = {}) {
  const calls = [];
  const rows = new Map();
  const client = {
    auth: {
      async getUser() {
        calls.push({ operation: "authenticate" });
        return {
          data: {
            user: Object.hasOwn(options, "user")
              ? options.user
              : { id: owner },
          },
          error: options.authError ?? null,
        };
      },
    },
    from(table) {
      assert.equal(table, "votes");
      return {
        async insert(values) {
          calls.push({ operation: "vote", values });
          if (options.voteThrows) throw options.voteThrows;
          return { error: options.voteError ?? null };
        },
      };
    },
  };
  const admin = {
    async rpc(name, values) {
      assert.equal(name, "reserve_generation");
      calls.push({ operation: "reserve", values });
      if (options.reserveError)
        return { data: null, error: options.reserveError };
      rows.set(generationId, {
        id: generationId,
        user_id: values.p_user_id,
        artist_id: values.p_artist_id,
        mood: values.p_mood,
        scene: values.p_scene,
        prompt: values.p_prompt,
        status: "pending",
      });
      return { data: generationId, error: null };
    },
    from(table) {
      assert.equal(table, "generations");
      return {
        update(values) {
          const filters = [];
          const query = {
            eq(column, value) {
              filters.push([column, value]);
              return query;
            },
            select(columns) {
              assert.equal(columns, "id");
              return query;
            },
            async single() {
              return execute();
            },
            then(resolve, reject) {
              return execute().then(resolve, reject);
            },
          };
          async function execute() {
            calls.push({ operation: "update", values, filters });
            const failure =
              values.status === "published"
                ? options.publishError
                : options.cleanupError;
            if (failure) return { data: null, error: failure };
            const row = [...rows.values()].find((candidate) =>
              filters.every(([column, value]) => candidate[column] === value),
            );
            if (!row) return { data: null, error: { code: "PGRST116" } };
            Object.assign(row, values);
            return { data: { id: row.id }, error: null };
          }
          return query;
        },
      };
    },
  };
  const actions = load(
    actionSource,
    {
      "next/cache": {
        revalidatePath(path) {
          calls.push({ operation: "revalidate", path });
        },
      },
      "@/lib/supabase/server": {
        async createClient() {
          calls.push({ operation: "userClient" });
          return client;
        },
      },
      "@/lib/supabase/admin": {
        createAdminClient() {
          calls.push({ operation: "adminClient" });
          if (options.adminError) throw options.adminError;
          return admin;
        },
      },
      "@/lib/supabase/config": {
        isSupabaseConfigured: () => options.configured !== false,
      },
      "@/lib/music/prompt": promptModule,
      "@/lib/music/gemini": {
        async generateNote(prompt) {
          calls.push({ operation: "generate", prompt });
          if (options.aiError) throw options.aiError;
          return note;
        },
      },
    },
    { GEMINI_API_KEY: options.missingKey ? undefined : "test-only-key" },
  );
  return {
    ...actions,
    calls,
    rows,
    operations: () => calls.map((call) => call.operation),
  };
}

test("both actions reject missing or invalid authentication before mutations and AI", async () => {
  for (const options of [
    { user: null },
    { authError: { message: "Invalid session" } },
  ]) {
    const studio = harness(options);
    assert.deepEqual(await studio.publishNote(input), {
      ok: false,
      message: "Sign in to create a mixtape note.",
    });
    assert.deepEqual(studio.operations(), ["userClient", "authenticate"]);
    const voting = harness(options);
    assert.deepEqual(await voting.submitVote(generationId, 1), {
      ok: false,
      message: "Sign in to cast your vote.",
    });
    assert.deepEqual(voting.operations(), ["userClient", "authenticate"]);
  }
});

test("invalid generation and vote inputs never reserve, generate, or insert", async () => {
  for (const invalid of [
    null,
    { ...input, artistId: "invented" },
    { ...input, mood: "invented" },
    { ...input, scene: "invented" },
    { ...input, idea: "x".repeat(241) },
  ]) {
    const app = harness();
    assert.equal((await app.publishNote(invalid)).ok, false);
    assert.deepEqual(app.operations(), ["userClient", "authenticate"]);
  }
  for (const [id, value] of [
    ["not-a-uuid", 1],
    [generationId, 0],
    [generationId, "1"],
  ]) {
    const app = harness();
    assert.equal((await app.submitVote(id, value)).ok, false);
    assert.deepEqual(app.operations(), []);
  }
});

test("missing configuration and AI credentials stop before reservation", async () => {
  const disconnected = harness({ configured: false });
  assert.equal((await disconnected.publishNote(input)).ok, false);
  assert.equal((await disconnected.submitVote(generationId, 1)).ok, false);
  assert.deepEqual(disconnected.operations(), []);
  const missingKey = harness({ missingKey: true });
  assert.match((await missingKey.publishNote(input)).message, /not connected/);
  assert.deepEqual(missingKey.operations(), ["userClient", "authenticate"]);
});

test("quota and reservation failures do not call Gemini or publish a row", async () => {
  for (const [code, message] of [
    ["P0001", /five daily studio attempts/],
    ["42501", /Publishing is unavailable/],
  ]) {
    const app = harness({ reserveError: { code } });
    const result = await app.publishNote(input);
    assert.equal(result.ok, false);
    assert.match(result.message, message);
    assert.deepEqual(app.operations(), [
      "userClient",
      "authenticate",
      "adminClient",
      "reserve",
    ]);
    assert.equal(app.rows.size, 0);
  }
});

test("publication saves the exact AI prompt and output under the authenticated owner", async () => {
  const app = harness();
  const spoofed = { ...input, userId: other, user_id: other };
  assert.equal((await app.publishNote(spoofed)).ok, true);
  const prompt = promptModule.buildPrompt(input);
  const reservation = app.calls.find((call) => call.operation === "reserve");
  assert.deepEqual(reservation.values, {
    p_user_id: owner,
    p_artist_id: input.artistId,
    p_mood: input.mood,
    p_scene: input.scene,
    p_prompt: prompt,
  });
  assert.equal(app.calls.find((call) => call.operation === "generate").prompt, prompt);
  assert.deepEqual(app.rows.get(generationId), {
    id: generationId,
    user_id: owner,
    artist_id: input.artistId,
    mood: input.mood,
    scene: input.scene,
    prompt,
    ...note,
    status: "published",
  });
  assert.deepEqual(app.calls.find((call) => call.operation === "update").filters, [
    ["id", generationId],
    ["user_id", owner],
    ["status", "pending"],
  ]);
  assert.deepEqual(app.calls.at(-1), { operation: "revalidate", path: "/" });
});

test("AI failure marks the reservation failed and never publishes or revalidates", async () => {
  const app = harness({ aiError: new Error("The AI studio is busy.") });
  assert.deepEqual(await app.publishNote(input), {
    ok: false,
    message: "The AI studio is busy.",
  });
  assert.equal(app.rows.get(generationId).status, "failed");
  const updates = app.calls.filter((call) => call.operation === "update");
  assert.deepEqual(updates, [{
    operation: "update",
    values: { status: "failed" },
    filters: [["id", generationId], ["status", "pending"]],
  }]);
  assert.equal(app.operations().includes("revalidate"), false);
});

test("timeout plus cleanup outage leaves only a private pending reservation", async () => {
  const timeout = new Error("Provider timed out");
  timeout.name = "TimeoutError";
  const app = harness({
    aiError: timeout,
    cleanupError: { code: "08006" },
  });
  assert.deepEqual(await app.publishNote(input), {
    ok: false,
    message: "The AI took too long. Please try again.",
  });
  assert.equal(app.rows.get(generationId).status, "pending");
  assert.equal(app.rows.get(generationId).caption, undefined);
  assert.equal(app.operations().includes("revalidate"), false);
});

test("publication failure keeps generated output off the wall", async () => {
  const app = harness({ publishError: { code: "08006" } });
  const result = await app.publishNote(input);
  assert.equal(result.ok, false);
  assert.match(result.message, /could not be saved/);
  assert.equal(app.rows.get(generationId).status, "failed");
  assert.equal(app.rows.get(generationId).caption, undefined);
  assert.equal(app.operations().includes("revalidate"), false);
});

test("valid votes bind the server-resolved owner and insert one ballot", async () => {
  for (const value of [-1, 1]) {
    const app = harness({ user: { id: other } });
    assert.equal((await app.submitVote(generationId, value, owner)).ok, true);
    assert.deepEqual(app.calls.find((call) => call.operation === "vote"), {
      operation: "vote",
      values: { generation_id: generationId, user_id: other, value },
    });
    assert.deepEqual(app.operations(), [
      "userClient",
      "authenticate",
      "vote",
      "revalidate",
    ]);
  }
});

test("duplicate ballots and database failures return failures without revalidation", async () => {
  for (const [options, message] of [
    [{ voteError: { code: "23505" } }, /already voted/],
    [{ voteError: { code: "42501" } }, /could not be saved/],
    [{ voteThrows: new Error("Connection lost") }, /temporarily unavailable/],
  ]) {
    const app = harness(options);
    const result = await app.submitVote(generationId, 1);
    assert.equal(result.ok, false);
    assert.match(result.message, message);
    assert.equal(app.operations().includes("revalidate"), false);
    assert.equal(app.operations().includes("adminClient"), false);
  }
});
