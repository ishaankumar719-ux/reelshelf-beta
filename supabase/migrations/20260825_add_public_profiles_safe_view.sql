-- Safe, email-excluding surface for every CROSS-USER profile read on both
-- mobile and the website. The base public.profiles table's RLS stays
-- exactly as it is today (a deliberate, separate follow-up will restrict it
-- once every cross-user call site is confirmed migrated off it) -- this view
-- exists so those call sites have somewhere safe to move to first.
--
-- Created without security_invoker, so it evaluates as its (privileged)
-- owner rather than the querying role -- meaning it reads straight through
-- the base table's RLS rather than being subject to it, and exposes exactly
-- the columns listed below, structurally excluding email regardless of what
-- any future caller asks for. The `where username is not null` filter
-- mirrors the base table's existing "Public can view shared profiles"
-- policy's row-visibility exactly, so this view exposes no MORE rows than
-- are already publicly visible today -- only fewer columns.
create or replace view public.public_profiles as
select
  id,
  username,
  display_name,
  avatar_url,
  bio,
  website_url,
  favourite_film,
  favourite_series,
  favourite_book,
  favourite_genres,
  is_public,
  created_at,
  updated_at
from public.profiles
where username is not null;

grant select on public.public_profiles to anon, authenticated;
