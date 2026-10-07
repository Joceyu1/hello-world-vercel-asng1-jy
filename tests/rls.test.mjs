import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import ts from "typescript";
const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const migrationDirectory = new URL("../supabase/migrations/", import.meta.url);
const initialMigration = new URL("202610070001_side_b.sql", migrationDirectory);
let publishedId;
async function createLegacyFixture(database, profileColumns) {
  await database.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, storage to anon, authenticated, service_role;
    create table public.profiles(id uuid primary key references auth.users(id), ${profileColumns});
    create table public.class_schedule(id int primary key, course_name text);
    create table public.legacy_private(id int);
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1, '/') $$;
    alter table storage.objects enable row level security;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
    create policy old_broad_policy on storage.objects for all to public using (true) with check (true);
    insert into auth.users values('${alice}'),('${bob}');
    insert into public.class_schedule values(1,'Existing schedule');
  `);
}
async function as(role, user, sql, params = []) {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [
      user ?? "",
    ]);
    const result = await db.query(sql, params);
    await db.exec("commit");
    return result;
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}
before(async () => {
  await createLegacyFixture(
    db,
    "firstname text not null, lastname text not null, avatar_path text",
  );
  await db.query(
    "insert into public.profiles(id,firstname,lastname) values($1,'Existing','Listener')",
    [bob],
  );
  const migrations = readdirSync(migrationDirectory)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const migration of migrations) {
    await db.exec(readFileSync(new URL(migration, migrationDirectory), "utf8"));
    if (migration === "202610070001_side_b.sql") {
      // Existing data must survive every later migration, just as in production.
      const reservation = await as(
        "service_role",
        null,
        "select public.reserve_generation($1,'tribe','Golden-hour stroll','Riverside Park','A saved full prompt') as id",
        [alice],
      );
      publishedId = reservation.rows[0].id;
      await as(
        "service_role",
        null,
        "update public.generations set title='City rhythm', caption='An original AI note.', model='test-model', status='published' where id=$1",
        [publishedId],
      );
    }
  }
});
after(async () => {
  await db.close();
});
test("legacy profile names are normalized without losing existing data or NOT NULL constraints", async () => {
  const { rows: columns } = await db.query(
    "select column_name, is_nullable from information_schema.columns where table_schema='public' and table_name='profiles' order by ordinal_position",
  );
  assert.deepEqual(columns, [
    { column_name: "id", is_nullable: "NO" },
    { column_name: "first_name", is_nullable: "NO" },
    { column_name: "last_name", is_nullable: "NO" },
    { column_name: "avatar_path", is_nullable: "YES" },
  ]);
  const { rows } = await db.query(
    "select id,first_name,last_name from public.profiles order by id",
  );
  assert.deepEqual(rows, [
    { id: alice, first_name: "", last_name: "" },
    { id: bob, first_name: "Existing", last_name: "Listener" },
  ]);
});

test("canonical profile columns also support existing data and required-name provisioning", async () => {
  const canonical = new PGlite();
  try {
    await createLegacyFixture(
      canonical,
      "first_name text not null, last_name text not null, avatar_path text",
    );
    await canonical.query(
      "insert into public.profiles(id,first_name,last_name) values($1,'Already','Canonical')",
      [bob],
    );
    await canonical.exec(readFileSync(initialMigration, "utf8"));
    assert.deepEqual(
      (await canonical.query("select id,first_name,last_name from public.profiles order by id")).rows,
      [
        { id: alice, first_name: "", last_name: "" },
        { id: bob, first_name: "Already", last_name: "Canonical" },
      ],
    );
    const newcomer = "44444444-4444-4444-8444-444444444444";
    await canonical.query("insert into auth.users values($1)", [newcomer]);
    assert.deepEqual(
      (await canonical.query("select first_name,last_name from public.profiles where id=$1", [newcomer])).rows,
      [{ first_name: "", last_name: "" }],
    );
  } finally {
    await canonical.close();
  }
});

for (const invalid of [
  {
    label: "ambiguous",
    columns: "firstname text not null, lastname text not null, last_name text, avatar_path text",
    error: /profiles contains both lastname and last_name/i,
  },
  {
    label: "missing",
    columns: "firstname text not null, avatar_path text",
    error: /profiles must contain last_name or lastname/i,
  },
]) {
  test(`${invalid.label} profile names reject and roll back the whole migration`, async () => {
    const invalidDb = new PGlite();
    try {
      await createLegacyFixture(invalidDb, invalid.columns);
      await invalidDb.exec(
        "create policy original_profile_access on public.profiles for select to authenticated using (true)",
      );
      const before = await invalidDb.query(
        "select column_name from information_schema.columns where table_schema='public' and table_name='profiles' order by ordinal_position",
      );
      await assert.rejects(
        () => invalidDb.exec(readFileSync(initialMigration, "utf8")),
        invalid.error,
      );
      await invalidDb.exec("rollback");
      assert.deepEqual(
        (await invalidDb.query("select column_name from information_schema.columns where table_schema='public' and table_name='profiles' order by ordinal_position")).rows,
        before.rows,
      );
      assert.deepEqual(
        (await invalidDb.query("select to_regclass('public.generations') as generations,to_regclass('public.votes') as votes")).rows,
        [{ generations: null, votes: null }],
      );
      assert.deepEqual(
        (await invalidDb.query("select policyname from pg_policies where schemaname='public' and tablename='profiles'")).rows,
        [{ policyname: "original_profile_access" }],
      );
    } finally {
      await invalidDb.close();
    }
  });
}

test("migration enables RLS on every public application table", async () => {
  const { rows } = await db.query(
    "select relname from pg_class join pg_namespace n on n.oid = relnamespace where n.nspname='public' and relkind='r' and not relrowsecurity",
  );
  assert.deepEqual(rows, []);
});
test("anonymous visitors read published notes but cannot see creator IDs or reserve AI attempts", async () => {
  assert.equal(
    (await as("anon", null, "select id, prompt from public.generations")).rows
      .length,
    1,
  );
  await assert.rejects(
    () => as("anon", null, "select user_id from public.generations"),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      as(
        "authenticated",
        alice,
        "select public.reserve_generation($1,'tribe','mood','scene','prompt')",
        [alice],
      ),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      as(
        "authenticated",
        alice,
        "insert into public.generations(user_id,artist_id,mood,scene,prompt) values($1,'tribe','mood','scene','fake')",
        [alice],
      ),
    /permission denied/,
  );
});
test("anonymous users cannot vote and authenticated users cannot impersonate others", async () => {
  await assert.rejects(
    () =>
      as(
        "anon",
        null,
        "insert into public.votes(generation_id,user_id,value) values($1,$2,1)",
        [publishedId, alice],
      ),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      as(
        "authenticated",
        bob,
        "insert into public.votes(generation_id,user_id,value) values($1,$2,1)",
        [publishedId, alice],
      ),
    /row-level security/,
  );
});
test("valid ballots insert rows, duplicates fail, and voter identities stay private", async () => {
  await as(
    "authenticated",
    alice,
    "insert into public.votes(generation_id,user_id,value) values($1,$2,1)",
    [publishedId, alice],
  );
  await as(
    "authenticated",
    bob,
    "insert into public.votes(generation_id,user_id,value) values($1,$2,-1)",
    [publishedId, bob],
  );
  await assert.rejects(
    () =>
      as(
        "authenticated",
        alice,
        "insert into public.votes(generation_id,user_id,value) values($1,$2,-1)",
        [publishedId, alice],
      ),
    /unique constraint/,
  );
  assert.equal(
    (await as("authenticated", alice, "select * from public.votes")).rows
      .length,
    1,
  );
  await assert.rejects(
    () => as("authenticated", alice, "update public.votes set value=-1"),
    /permission denied/,
  );
  await assert.rejects(
    () => as("authenticated", alice, "delete from public.votes"),
    /permission denied/,
  );
  const { rows } = await as(
    "anon",
    null,
    "select * from public.vote_totals($1::uuid[])",
    [[publishedId]],
  );
  assert.equal(Number(rows[0].score), 0);
  assert.equal(Number(rows[0].upvotes), 1);
  assert.equal(Number(rows[0].downvotes), 1);
  assert.equal("user_id" in rows[0], false);
});
test("daily quota stops the sixth reservation and pending notes are hidden and unvotable", async () => {
  let pendingId;
  for (let i = 0; i < 4; i++)
    pendingId = (
      await as(
        "service_role",
        null,
        "select public.reserve_generation($1,'tribe','mood','scene','prompt') as id",
        [alice],
      )
    ).rows[0].id;
  await assert.rejects(
    () =>
      as(
        "service_role",
        null,
        "select public.reserve_generation($1,'tribe','mood','scene','prompt')",
        [alice],
      ),
    /Daily limit reached/,
  );
  assert.equal(
    (await as("anon", null, "select id from public.generations")).rows.length,
    1,
  );
  await assert.rejects(
    () =>
      as(
        "authenticated",
        bob,
        "insert into public.votes(generation_id,user_id,value) values($1,$2,1)",
        [pendingId, bob],
      ),
    /row-level security/,
  );
});
test("profiles are provisioned automatically and users can only read and edit their own", async () => {
  assert.equal(
    (await as("authenticated", alice, "select * from public.profiles")).rows
      .length,
    1,
  );
  const other = await as(
    "authenticated",
    alice,
    "update public.profiles set first_name='Stolen' where id=$1 returning id",
    [bob],
  );
  assert.equal(other.rows.length, 0);
  await as(
    "authenticated",
    alice,
    "update public.profiles set first_name='Sam',last_name='Listener',avatar_path=$1 where id=$2",
    [`${alice}/avatar`, alice],
  );
  await assert.rejects(
    () =>
      as(
        "authenticated",
        alice,
        "update public.profiles set avatar_path=$1 where id=$2",
        [`${bob}/avatar`, alice],
      ),
    /row-level security/,
  );
  await assert.rejects(
    () => as("anon", null, "select * from public.profiles"),
    /permission denied/,
  );
  const newcomer = "33333333-3333-4333-8333-333333333333";
  await db.query("insert into auth.users values($1)", [newcomer]);
  assert.equal(
    (await as("authenticated", newcomer, "select id from public.profiles")).rows
      .length,
    1,
  );
  assert.deepEqual(
    (await as("authenticated", newcomer, "select first_name,last_name from public.profiles")).rows,
    [{ first_name: "", last_name: "" }],
  );
});
test("avatar restrictive guard defeats old permissive policies while allowing owner upserts", async () => {
  await as(
    "authenticated",
    alice,
    "insert into storage.objects(bucket_id,name) values('avatars',$1)",
    [`${alice}/avatar`],
  );
  await as(
    "authenticated",
    alice,
    "update storage.objects set name=name where bucket_id='avatars'",
  );
  assert.equal(
    (
      await as(
        "authenticated",
        alice,
        "select * from storage.objects where bucket_id='avatars'",
      )
    ).rows.length,
    1,
  );
  assert.equal(
    (
      await as(
        "authenticated",
        bob,
        "select * from storage.objects where bucket_id='avatars'",
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await as(
        "anon",
        null,
        "select * from storage.objects where bucket_id='avatars'",
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    () =>
      as(
        "authenticated",
        bob,
        "insert into storage.objects(bucket_id,name) values('avatars',$1)",
        [`${alice}/avatar`],
      ),
    /row-level security/,
  );
  assert.equal(
    (await db.query("select public from storage.buckets where id='avatars'"))
      .rows[0].public,
    false,
  );
});
test("legacy schedule remains readable but cannot be mutated by browsers", async () => {
  assert.equal(
    (await as("anon", null, "select * from public.class_schedule")).rows.length,
    1,
  );
  await assert.rejects(
    () =>
      as(
        "authenticated",
        alice,
        "insert into public.class_schedule values(2,'Unexpected')",
      ),
    /permission denied/,
  );
});

test("old policies cannot permit extra avatar paths or deletion", async () => {
  await assert.rejects(
    () =>
      as(
        "authenticated",
        alice,
        "insert into storage.objects(bucket_id,name) values('avatars',$1)",
        [`${alice}/extra`],
      ),
    /row-level security/,
  );
  const deleted = await as(
    "authenticated",
    alice,
    "delete from storage.objects where bucket_id='avatars' returning id",
  );
  assert.equal(deleted.rows.length, 0);
});

test("catalog expansion preserves existing published generations", async () => {
  const { rows } = await as(
    "anon",
    null,
    "select id, artist_id, prompt, title, caption, model from public.generations where id=$1",
    [publishedId],
  );
  assert.deepEqual(rows, [{
    id: publishedId,
    artist_id: "tribe",
    prompt: "A saved full prompt",
    title: "City rhythm",
    caption: "An original AI note.",
    model: "test-model",
  }]);
});

test("expanded artists can reserve notes and unknown artists remain rejected", async () => {
  const { rows } = await as(
    "service_role",
    null,
    "select public.reserve_generation($1,'mary-j-blige','mood','scene','A new artist prompt') as id",
    [bob],
  );
  const reservation = await db.query(
    "select artist_id, status from public.generations where id=$1",
    [rows[0].id],
  );
  assert.deepEqual(reservation.rows, [{ artist_id: "mary-j-blige", status: "pending" }]);
  await assert.rejects(
    () => as(
      "service_role",
      null,
      "select public.reserve_generation($1,'unknown-artist','mood','scene','prompt')",
      [bob],
    ),
    /generations_artist_id_check/,
  );
  assert.equal(
    (await as("anon", null, "select id from public.generations")).rows.length,
    1,
  );
});

test("database artist whitelist exactly matches all 30 catalog artists", async () => {
  // Use the actual catalog export rather than maintaining another copied list.
  const compiled = ts.transpileModule(
    readFileSync(new URL("../lib/music/artists.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  );
  const catalogExports = {};
  new Function("exports", compiled.outputText)(catalogExports);
  const artistIds = catalogExports.artists.map((artist) => artist.id).sort();
  assert.equal(artistIds.length, 30);
  const { rows } = await db.query(
    "select pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.generations'::regclass and conname='generations_artist_id_check'",
  );
  const allowedIds = [...rows[0].definition.matchAll(/'([^']+)'::text/g)]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(allowedIds, artistIds);
  // Verify every catalog ID is accepted, without consuming users' daily quotas.
  await db.exec("begin; set local role service_role");
  try {
    const inserted = await db.query(
      "insert into public.generations(user_id,artist_id,mood,scene,prompt) select $1::uuid, artist_id, 'mood', 'scene', 'prompt' from unnest($2::text[]) as catalog(artist_id) returning artist_id",
      [bob, artistIds],
    );
    assert.deepEqual(inserted.rows.map((row) => row.artist_id).sort(), artistIds);
  } finally {
    await db.exec("rollback");
  }
});
