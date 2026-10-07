import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
let publishedId;
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
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, storage to anon, authenticated, service_role;
    create table public.profiles(id uuid primary key references auth.users(id), first_name text, last_name text, avatar_path text);
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
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/202610070001_side_b.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
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
});
after(async () => {
  await db.close();
});
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
