alter table public.profiles
add column if not exists website_url text;

alter table public.profiles
add column if not exists is_public boolean not null default true;

create table if not exists public.mount_rushmore (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  position int check (position between 1 and 4) not null,
  media_id int not null,
  media_type text check (media_type in ('film','series')) not null,
  title text not null,
  year text,
  poster_path text,
  created_at timestamptz default now(),
  unique (user_id, position)
);

insert into public.mount_rushmore (user_id, position, media_id, media_type, title, year, poster_path)
select
  p.id,
  item.ordinality::int as position,
  case
    when coalesce(item.value ->> 'tmdbId', '') ~ '^\d+$' then (item.value ->> 'tmdbId')::int
    else null
  end as media_id,
  'film'::text as media_type,
  coalesce(nullif(item.value ->> 'title', ''), 'Untitled') as title,
  nullif(item.value ->> 'year', '') as year,
  nullif(item.value ->> 'poster', '') as poster_path
from public.profiles p
cross join lateral jsonb_array_elements(
  case
    when jsonb_typeof(p.movie_mount_rushmore) = 'array' then p.movie_mount_rushmore
    else '[]'::jsonb
  end
) with ordinality as item(value, ordinality)
where item.ordinality between 1 and 4
  and coalesce(item.value ->> 'tmdbId', '') ~ '^\d+$'
on conflict (user_id, position) do update
set
  media_id = excluded.media_id,
  media_type = excluded.media_type,
  title = excluded.title,
  year = excluded.year,
  poster_path = excluded.poster_path;

alter table public.mount_rushmore enable row level security;

drop policy if exists "Users can read any rushmore" on public.mount_rushmore;
create policy "Users can read any rushmore"
on public.mount_rushmore
for select
using (true);

drop policy if exists "Users can manage their own rushmore" on public.mount_rushmore;
create policy "Users can manage their own rushmore"
on public.mount_rushmore
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
