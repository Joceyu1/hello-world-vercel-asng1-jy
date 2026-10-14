begin;

-- Read current Auth records, not stale JWT email claims or user-editable
-- raw_user_meta_data. This also denies pre-existing personal-account sessions.
create schema if not exists side_b_private;
revoke all on schema side_b_private from public, anon, authenticated;
grant usage on schema side_b_private to service_role;

create function side_b_private.is_columbia_google_user(user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    join auth.identities i on i.user_id = u.id
    where u.id = $1
      and u.email_confirmed_at is not null
      and u.email ~* '^[^@[:space:]]+@columbia[.]edu$'
      and u.raw_app_meta_data ->> 'provider' = 'google'
      and i.provider = 'google'
      and i.identity_data -> 'email_verified' = 'true'::jsonb
      and lower(i.identity_data ->> 'email') = lower(u.email)
  );
$$;
revoke all on function side_b_private.is_columbia_google_user(uuid) from public, anon, authenticated;
grant execute on function side_b_private.is_columbia_google_user(uuid) to service_role;

-- Public wrapper exposes only the requesting user's eligibility, never an
-- arbitrary user's Auth record. The private helper is outside exposed schemas.
create function public.is_columbia_google_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select side_b_private.is_columbia_google_user(auth.uid());
$$;
revoke all on function public.is_columbia_google_user() from public;
grant execute on function public.is_columbia_google_user() to anon, authenticated;

-- Restrictive policies cannot be bypassed by an older permissive policy.
-- Published generations, aggregate totals, and the schedule remain public.
create policy columbia_votes_guard on public.votes as restrictive
for all to authenticated
using ((select public.is_columbia_google_user()))
with check ((select public.is_columbia_google_user()));
create policy columbia_profiles_guard on public.profiles as restrictive
for all to authenticated
using ((select public.is_columbia_google_user()))
with check ((select public.is_columbia_google_user()));
create policy columbia_avatars_guard on storage.objects as restrictive
for all to anon, authenticated
using (bucket_id <> 'avatars' or (select public.is_columbia_google_user()))
with check (bucket_id <> 'avatars' or (select public.is_columbia_google_user()));
create policy columbia_generations_insert_guard on public.generations as restrictive
for insert to authenticated with check ((select public.is_columbia_google_user()));
create policy columbia_generations_update_guard on public.generations as restrictive
for update to authenticated
using ((select public.is_columbia_google_user()))
with check ((select public.is_columbia_google_user()));
create policy columbia_generations_delete_guard on public.generations as restrictive
for delete to authenticated using ((select public.is_columbia_google_user()));

-- Browser callers still cannot reserve or publish. The server's service-role
-- reservation must ALSO validate its target user, since service_role bypasses RLS.
create or replace function public.reserve_generation(p_user_id uuid, p_artist_id text, p_mood text, p_scene text, p_prompt text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare new_id uuid;
begin
  if not side_b_private.is_columbia_google_user(p_user_id) then
    raise exception 'A verified @columbia.edu Google account is required' using errcode = '42501';
  end if;
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

commit;
