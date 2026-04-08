alter table public.profiles
add column if not exists bio text;

alter table public.profiles
add column if not exists favourite_film text;

alter table public.profiles
add column if not exists favourite_series text;

alter table public.profiles
add column if not exists favourite_book text;

create unique index if not exists profiles_username_unique_idx
on public.profiles (username)
where username is not null;

alter table public.profiles enable row level security;
alter table public.diary_entries enable row level security;

drop policy if exists "Public can view shared profiles" on public.profiles;
create policy "Public can view shared profiles"
on public.profiles
for select
using (username is not null);

drop policy if exists "Public can view shared diary entries" on public.diary_entries;
create policy "Public can view shared diary entries"
on public.diary_entries
for select
using (
  exists (
    select 1
    from public.profiles
    where public.profiles.id = public.diary_entries.user_id
      and public.profiles.username is not null
  )
);
