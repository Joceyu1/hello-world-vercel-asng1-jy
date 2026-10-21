-- PROPOSED ONLY: owner review and explicit approval required before execution.
-- TA feedback: allow a voter to change their own vote after it is cast.
-- Target: original SIDE B project qrgjqpdvvbwmjpthpmlo, not the unused new project.
-- Existing Google/Columbia eligibility, unique ballots, and admin guards remain.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $guard$
begin
  if not exists (
    select 1 from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and relation.relname = 'votes'
      and relation.relkind = 'r' and relation.relrowsecurity
  ) then
    raise exception 'Expected original votes table with enabled RLS. Confirm the original app project.';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_policy
    where polrelid = 'public.votes'::pg_catalog.regclass
      and polname = 'columbia_votes_guard' and not polpermissive and polcmd = '*'
  ) then
    raise exception 'Expected restrictive Google/Columbia voting guard is missing; review existing access rules first.';
  end if;
  if exists (
    select 1 from pg_catalog.pg_policy
    where polrelid = 'public.votes'::pg_catalog.regclass
      and (polname = 'own_votes_update' or (polpermissive and polcmd in ('w', '*')))
  ) then
    raise exception 'A vote-update policy already exists. Review it rather than replacing unknown rules.';
  end if;
  if pg_catalog.has_any_column_privilege('authenticated', 'public.votes', 'UPDATE')
     or pg_catalog.has_any_column_privilege('anon', 'public.votes', 'UPDATE') then
    raise exception 'Unexpected existing vote-update privileges. Review them before changing voting permissions.';
  end if;
end;
$guard$;

-- Only the ballot value may change. User, note, id, and creation time stay fixed.
grant update(value) on public.votes to authenticated;
create policy own_votes_update on public.votes
for update to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.generations as generation
    where generation.id = generation_id and generation.status = 'published'
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.generations as generation
    where generation.id = generation_id and generation.status = 'published'
  )
);

-- Existing columbia_votes_guard applies restrictively to UPDATE too.
-- No DELETE privilege/policy, identity-key UPDATE, or admin vote-edit RPC is added.
notify pgrst, 'reload schema';
commit;
