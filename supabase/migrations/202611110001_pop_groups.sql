begin;

-- Apply after the existing SIDE B migrations. Only widen the known artist
-- check: saved notes, ballots, grants, and row-level policies remain in place.
lock table public.generations in access exclusive mode;

do $$
declare
  existing_ids text[];
  original_ids constant text[] := array[
    'tribe', 'de-la', 'wu-tang', 'nas', 'guy', 'bell-biv', 'janet',
    'prodigy', 'orbital', '808',
    'tlc', 'xscape', 'swv', 'en-vogue', 'jodeci', 'hi-five', 'la-boyz',
    'eyc', 'bobby-brown', 'inner-city', 'underground-resistance',
    'mary-j-blige', 'jeff-mills', '2-unlimited', 'snap', 'culture-beat',
    'real-mccoy', 'dead-or-alive', 'dave-rodgers', 'sinitta'
  ];
  new_ids constant text[] := array[
    'nsync', 'destinys-child', 'backstreet-boys', 'westlife', 'spice-girls',
    'take-that', 'boyzone', '98-degrees', 'all-saints', 's-club-7'
  ];
begin
  select array_agg(matches[1] order by matches[1]) into existing_ids
  from pg_constraint c
  cross join lateral regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g') matches
  where c.conrelid = 'public.generations'::regclass
    and c.conname = 'generations_artist_id_check' and c.contype = 'c';

  if existing_ids is null or (
    existing_ids <> (select array_agg(id order by id) from unnest(original_ids) id)
    and existing_ids <> (select array_agg(id order by id) from unnest(original_ids || new_ids) id)
  ) then
    raise exception 'Unexpected SIDE B artist whitelist. Inspect the existing constraint before applying this migration.';
  end if;
end;
$$;

alter table public.generations
  drop constraint generations_artist_id_check;
alter table public.generations
  add constraint generations_artist_id_check check (artist_id in (
    'tribe', 'de-la', 'wu-tang', 'nas', 'guy', 'bell-biv', 'janet',
    'prodigy', 'orbital', '808',
    'tlc', 'xscape', 'swv', 'en-vogue', 'jodeci', 'hi-five', 'la-boyz',
    'eyc', 'bobby-brown', 'inner-city', 'underground-resistance',
    'mary-j-blige', 'jeff-mills', '2-unlimited', 'snap', 'culture-beat',
    'real-mccoy', 'dead-or-alive', 'dave-rodgers', 'sinitta',
    'nsync', 'destinys-child', 'backstreet-boys', 'westlife', 'spice-girls',
    'take-that', 'boyzone', '98-degrees', 'all-saints', 's-club-7'
  ));

-- The application uses this public, data-free marker to enable the new groups
-- in the AI studio only after their database IDs are accepted. Installation
-- and marker activation commit together; a refused upgrade exposes no marker.
create or replace function public.side_b_pop_groups_ready()
returns boolean
language sql stable security invoker
set search_path = ''
as $$ select true $$;
revoke all on function public.side_b_pop_groups_ready() from public;
grant execute on function public.side_b_pop_groups_ready() to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
