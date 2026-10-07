begin;

-- Expand the artist whitelist without replacing tables, data, or RLS policies.
-- Apply after 202610070001_side_b.sql, including on existing SIDE B databases.
alter table public.generations
  drop constraint generations_artist_id_check;
alter table public.generations
  add constraint generations_artist_id_check check (artist_id in (
    'tribe', 'de-la', 'wu-tang', 'nas', 'guy', 'bell-biv', 'janet',
    'prodigy', 'orbital', '808',
    'tlc', 'xscape', 'swv', 'en-vogue', 'jodeci', 'hi-five', 'la-boyz',
    'eyc', 'bobby-brown', 'inner-city', 'underground-resistance',
    'mary-j-blige', 'jeff-mills', '2-unlimited', 'snap', 'culture-beat',
    'real-mccoy', 'dead-or-alive', 'dave-rodgers', 'sinitta'
  ));

commit;
