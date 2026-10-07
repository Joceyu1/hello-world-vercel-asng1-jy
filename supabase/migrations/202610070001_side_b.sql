begin;

-- Assignment #3 schemas used both name spellings. Normalize legacy columns
-- before creating SIDE B tables, retaining their values and constraints.
do $$
declare
  legacy_name text;
  canonical_name text;
  has_legacy boolean;
  has_canonical boolean;
begin
  for legacy_name, canonical_name in
    select * from (values ('firstname', 'first_name'), ('lastname', 'last_name')) as names(legacy_name, canonical_name)
  loop
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = legacy_name
    ) into has_legacy;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = canonical_name
    ) into has_canonical;
    if has_legacy and has_canonical then
      raise exception 'profiles contains both % and %. Resolve the duplicate name columns before running SIDE B setup.', legacy_name, canonical_name;
    elsif has_legacy then
      execute format('alter table public.profiles rename column %I to %I', legacy_name, canonical_name);
    elsif not has_canonical then
      raise exception 'profiles must contain % or % before running SIDE B setup.', canonical_name, legacy_name;
    end if;
  end loop;
end; $$;

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_id text not null check (artist_id in ('tribe','de-la','wu-tang','nas','guy','bell-biv','janet','prodigy','orbital','808')),
  mood text not null check (char_length(mood) between 1 and 80),
  scene text not null check (char_length(scene) between 1 and 80),
  prompt text not null check (char_length(prompt) between 1 and 5000),
  title text check (char_length(title) between 1 and 90),
  caption text check (char_length(caption) between 1 and 900),
  model text,
  status text not null default 'pending' check (status in ('pending','published','failed')),
  created_at timestamptz not null default now(),
  check (status <> 'published' or (title is not null and caption is not null and model is not null))
);
create index generations_feed on public.generations(created_at desc) where status = 'published';
create index generations_quota on public.generations(user_id, created_at);
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (generation_id, user_id)
);
create index votes_generation on public.votes(generation_id);
alter table public.generations enable row level security;
alter table public.votes enable row level security;
revoke all on public.generations, public.votes from anon, authenticated;
grant select(id, artist_id, mood, scene, prompt, title, caption, model, status, created_at) on public.generations to anon, authenticated;
grant select, insert on public.votes to authenticated;
grant all on public.generations, public.votes to service_role;
create policy published_generations on public.generations for select to anon, authenticated using (status = 'published');
create policy own_votes_read on public.votes for select to authenticated using (user_id = (select auth.uid()));
create policy own_votes_insert on public.votes for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.generations g where g.id = generation_id and g.status = 'published'
  )
);
-- No UPDATE or DELETE policies: one immutable ballot per user per note.
-- AI output can only be published by the trusted server, never by a browser.

create function public.reserve_generation(p_user_id uuid, p_artist_id text, p_mood text, p_scene text, p_prompt text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare new_id uuid;
begin
  -- Serialize reservations per user so parallel requests cannot bypass the quota.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  if (select count(*) from public.generations where user_id = p_user_id
      and created_at >= (date_trunc('day', now() at time zone 'UTC') at time zone 'UTC')) >= 5 then
    raise exception 'Daily limit reached' using errcode = 'P0001';
  end if;
  insert into public.generations(user_id, artist_id, mood, scene, prompt)
  values(p_user_id, p_artist_id, p_mood, p_scene, p_prompt) returning id into new_id;
  return new_id;
end; $$;
revoke all on function public.reserve_generation(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.reserve_generation(uuid,text,text,text,text) to service_role;

-- Only aggregates cross user boundaries, never individual voter identities.
create function public.vote_totals(generation_ids uuid[])
returns table(generation_id uuid, score bigint, upvotes bigint, downvotes bigint)
language sql stable security definer set search_path = '' as $$
  select v.generation_id, sum(v.value)::bigint,
    count(*) filter (where v.value = 1), count(*) filter (where v.value = -1)
  from public.votes v join public.generations g on g.id = v.generation_id
  where g.status = 'published' and v.generation_id = any(generation_ids[1:100])
  group by v.generation_id;
$$;
revoke all on function public.vote_totals(uuid[]) from public;
grant execute on function public.vote_totals(uuid[]) to anon, authenticated;

-- RLS for every existing public application table. Unknown tables keep their
-- existing policies; audit those separately rather than guessing their use.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- Replace permissive policies on the known Assignment #3 tables.
do $$ declare p record; begin
  for p in select tablename, policyname from pg_policies where schemaname = 'public'
    and tablename in ('profiles', 'class_schedule') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(first_name, last_name, avatar_path) on public.profiles to authenticated;
create policy own_profile_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy own_profile_update on public.profiles for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and (avatar_path is null or avatar_path = id::text || '/avatar'));

-- Provision profiles server-side. Browsers cannot create someone else's profile.
create function public.side_b_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, first_name, last_name)
  values(new.id, '', '') on conflict(id) do nothing;
  return new;
end; $$;
revoke all on function public.side_b_new_user() from public, anon, authenticated;
create trigger side_b_profile_created after insert on auth.users for each row execute function public.side_b_new_user();
insert into public.profiles(id, first_name, last_name)
select id, '', '' from auth.users on conflict(id) do nothing;

alter table public.class_schedule enable row level security;
revoke all on public.class_schedule from anon, authenticated;
grant select on public.class_schedule to anon, authenticated;
create policy public_schedule_read on public.class_schedule for select to anon, authenticated using (true);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('avatars','avatars',false,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public = false, file_size_limit = 2097152,
 allowed_mime_types = array['image/jpeg','image/png','image/webp'];
-- Restrictive guard protects avatars even if older permissive storage policies exist.
create policy side_b_avatar_guard on storage.objects as restrictive for all to public
using (bucket_id <> 'avatars' or name = (select auth.uid())::text || '/avatar')
with check (bucket_id <> 'avatars' or name = (select auth.uid())::text || '/avatar');
create policy side_b_avatar_no_delete on storage.objects as restrictive for delete to anon, authenticated
using (bucket_id <> 'avatars');
create policy side_b_avatar_read on storage.objects for select to authenticated
using (bucket_id = 'avatars' and (select auth.uid())::text = (storage.foldername(name))[1]);
create policy side_b_avatar_insert on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar');
create policy side_b_avatar_update on storage.objects for update to authenticated
using (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar')
with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar');
commit;
