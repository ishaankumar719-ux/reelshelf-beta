create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  username text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists username text;

alter table public.profiles
add column if not exists display_name text;

alter table public.profiles
add column if not exists avatar_url text;

alter table public.profiles
add column if not exists bio text;

alter table public.profiles
add column if not exists website_url text;

alter table public.profiles
add column if not exists is_public boolean not null default true;

alter table public.profiles
add column if not exists favourite_film text;

alter table public.profiles
add column if not exists favourite_series text;

alter table public.profiles
add column if not exists favourite_book text;

alter table public.profiles
add column if not exists movie_mount_rushmore jsonb not null default '[]'::jsonb;

create unique index if not exists profiles_username_unique_idx
on public.profiles (username)
where username is not null;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
set public = true;

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  media_id text not null,
  media_type text not null check (media_type in ('movie', 'tv', 'book')),
  review_scope text not null default 'show' check (review_scope in ('title', 'show', 'season', 'episode')),
  show_id text not null default '',
  season_number integer,
  episode_number integer,
  title text not null,
  poster text,
  year integer not null default 0,
  creator text,
  genres text[] not null default '{}',
  runtime integer,
  vote_average numeric,
  rating numeric,
  review text not null default '',
  contains_spoilers boolean not null default false,
  watched_date date not null,
  favourite boolean not null default false,
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mount_rushmore (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  position int check (position between 1 and 4) not null,
  media_id int,
  media_type text check (media_type in ('film','series')),
  title text,
  year text,
  poster_path text,
  created_at timestamptz default now(),
  unique (user_id, position)
);

alter table public.diary_entries
add column if not exists review_scope text not null default 'show' check (review_scope in ('title', 'show', 'season', 'episode'));

alter table public.diary_entries
add column if not exists show_id text not null default '';

alter table public.diary_entries
add column if not exists season_number integer;

alter table public.diary_entries
add column if not exists episode_number integer;

alter table public.diary_entries
add column if not exists contains_spoilers boolean not null default false;

update public.diary_entries
set review_scope = 'show'
where review_scope = 'title';

update public.diary_entries
set season_number = null, episode_number = null
where review_scope = 'show';

update public.diary_entries
set episode_number = null
where review_scope = 'season' and episode_number = 0;

drop index if exists public.diary_entries_scope_unique_idx;

create unique index if not exists diary_entries_unique_show
  on public.diary_entries (user_id, media_id)
  where review_scope = 'show';

create unique index if not exists diary_entries_unique_season
  on public.diary_entries (user_id, media_id, season_number)
  where review_scope = 'season';

create unique index if not exists diary_entries_unique_episode
  on public.diary_entries (user_id, media_id, season_number, episode_number)
  where review_scope = 'episode';

create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  list_type text not null check (list_type in ('watchlist', 'reading_shelf')),
  media_id text not null,
  media_type text not null check (media_type in ('movie', 'tv', 'book')),
  title text not null,
  poster text,
  year integer not null default 0,
  creator text,
  genres text[] not null default '{}',
  runtime integer,
  vote_average numeric,
  added_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, list_type, media_type, media_id)
);

create table if not exists public.followers (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.diary_entry_likes (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references public.diary_entries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (diary_entry_id, user_id)
);

create table if not exists public.diary_entry_comments (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references public.diary_entries (id) on delete cascade,
  parent_comment_id uuid references public.diary_entry_comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(body)) > 0)
);

create table if not exists public.user_gamification (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  total_entries integer not null default 0,
  review_count integer not null default 0,
  likes_received integer not null default 0,
  comments_received integer not null default 0,
  badges text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_challenge_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  entries_logged integer not null default 0,
  reviews_written integer not null default 0,
  likes_given integer not null default 0,
  comments_written integer not null default 0,
  completed_challenges text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.profiles enable row level security;
alter table public.mount_rushmore enable row level security;
alter table public.diary_entries enable row level security;
alter table public.saved_items enable row level security;
alter table public.followers enable row level security;
alter table public.diary_entry_likes enable row level security;
alter table public.diary_entry_comments enable row level security;
alter table public.user_gamification enable row level security;
alter table public.weekly_challenge_progress enable row level security;

create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id);

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

drop policy if exists "Public can view shared profiles" on public.profiles;
create policy "Public can view shared profiles"
on public.profiles
for select
using (username is not null);

create policy "Users can view own diary entries"
on public.diary_entries
for select
using (auth.uid() = user_id);

create policy "Users can insert own diary entries"
on public.diary_entries
for insert
with check (auth.uid() = user_id);

create policy "Users can update own diary entries"
on public.diary_entries
for update
using (auth.uid() = user_id);

create policy "Users can delete own diary entries"
on public.diary_entries
for delete
using (auth.uid() = user_id);

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

create policy "Users can view own saved items"
on public.saved_items
for select
using (auth.uid() = user_id);

create policy "Users can insert own saved items"
on public.saved_items
for insert
with check (auth.uid() = user_id);

create policy "Users can update own saved items"
on public.saved_items
for update
using (auth.uid() = user_id);

create policy "Users can delete own saved items"
on public.saved_items
for delete
using (auth.uid() = user_id);

drop policy if exists "Public can view follow relationships" on public.followers;
create policy "Public can view follow relationships"
on public.followers
for select
using (true);

drop policy if exists "Users can follow profiles" on public.followers;
create policy "Users can follow profiles"
on public.followers
for insert
to authenticated
with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow profiles" on public.followers;
create policy "Users can unfollow profiles"
on public.followers
for delete
to authenticated
using (auth.uid() = follower_id);

drop policy if exists "Public can view diary entry likes" on public.diary_entry_likes;
create policy "Public can view diary entry likes"
on public.diary_entry_likes
for select
using (true);

drop policy if exists "Users can like public diary entries" on public.diary_entry_likes;
create policy "Users can like public diary entries"
on public.diary_entry_likes
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.diary_entries
    join public.profiles on public.profiles.id = public.diary_entries.user_id
    where public.diary_entries.id = diary_entry_likes.diary_entry_id
      and public.profiles.username is not null
      and public.diary_entries.user_id <> auth.uid()
  )
);

drop policy if exists "Users can unlike own diary likes" on public.diary_entry_likes;
create policy "Users can unlike own diary likes"
on public.diary_entry_likes
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Public can view diary entry comments" on public.diary_entry_comments;
create policy "Public can view diary entry comments"
on public.diary_entry_comments
for select
using (true);

drop policy if exists "Users can comment on public diary entries" on public.diary_entry_comments;
create policy "Users can comment on public diary entries"
on public.diary_entry_comments
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.diary_entries
    join public.profiles on public.profiles.id = public.diary_entries.user_id
    where public.diary_entries.id = diary_entry_comments.diary_entry_id
      and public.profiles.username is not null
  )
  and (
    parent_comment_id is null
    or exists (
      select 1
      from public.diary_entry_comments parent
      where parent.id = diary_entry_comments.parent_comment_id
        and parent.parent_comment_id is null
        and parent.diary_entry_id = diary_entry_comments.diary_entry_id
    )
  )
);

drop policy if exists "Users can view own gamification" on public.user_gamification;
create policy "Users can view own gamification"
on public.user_gamification
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own gamification" on public.user_gamification;
create policy "Users can insert own gamification"
on public.user_gamification
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own gamification" on public.user_gamification;
create policy "Users can update own gamification"
on public.user_gamification
for update
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view own weekly challenges" on public.weekly_challenge_progress;
create policy "Users can view own weekly challenges"
on public.weekly_challenge_progress
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own weekly challenges" on public.weekly_challenge_progress;
create policy "Users can insert own weekly challenges"
on public.weekly_challenge_progress
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own weekly challenges" on public.weekly_challenge_progress;
create policy "Users can update own weekly challenges"
on public.weekly_challenge_progress
for update
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar images" on storage.objects;
create policy "Users can upload own avatar images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own avatar images" on storage.objects;
create policy "Users can update own avatar images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own avatar images" on storage.objects;
create policy "Users can delete own avatar images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
