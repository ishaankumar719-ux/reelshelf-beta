-- STAGING ONLY. Copies production's diary_entries and mount_rushmore tables (columns,
-- keys and RLS policies) so profile screens load on staging. Not for production.

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id text not null, media_type text not null, title text not null, poster text,
  year integer not null default 0, creator text, genres text[] not null default '{}'::text[],
  runtime integer, vote_average numeric, rating numeric, review text not null default '',
  watched_date date not null, favourite boolean not null default false,
  saved_at timestamptz not null default now(), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), review_scope text not null default 'show',
  show_id text not null default '', season_number integer not null default 0,
  episode_number integer not null default 0, contains_spoilers boolean not null default false,
  rewatch boolean not null default false, reelshelf_score numeric, score_rating numeric,
  cinematography_rating numeric, writing_rating numeric, performances_rating numeric,
  direction_rating numeric, rewatchability_rating numeric, emotional_impact_rating numeric,
  entertainment_rating numeric, attachment_url text, attachment_type text,
  watched_in_cinema boolean not null default false, review_cover_url text, review_cover_source text,
  letterboxd_rating numeric, watched_live boolean not null default false,
  binge_watched boolean not null default false, reread boolean not null default false,
  physical_book boolean not null default false, ebook boolean not null default false,
  audiobook boolean not null default false, layer_characters numeric, layer_plot numeric,
  layer_pacing numeric, layer_worldbuilding numeric, layer_themes numeric, layer_rereadability numeric
);
create unique index if not exists diary_entries_upsert_key
  on public.diary_entries (user_id, media_type, media_id, review_scope, season_number, episode_number);
alter table public.diary_entries enable row level security;
create policy "Public can view shared diary entries" on public.diary_entries for select
  using (exists (select 1 from public.public_profiles where public_profiles.id = diary_entries.user_id));
create policy "Users can view own diary entries" on public.diary_entries for select using (auth.uid() = user_id);
create policy "Users can insert own diary entries" on public.diary_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own diary entries" on public.diary_entries for update using (auth.uid() = user_id);
create policy "Users can delete own diary entries" on public.diary_entries for delete using (auth.uid() = user_id);
grant select, insert, update, delete on public.diary_entries to authenticated;
grant select on public.diary_entries to anon;

create table if not exists public.mount_rushmore (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null, media_id text not null, media_type text not null, title text not null,
  year text, poster_path text, created_at timestamptz default now(),
  unique (user_id, position, media_type)
);
alter table public.mount_rushmore enable row level security;
create policy "Anyone can read mount_rushmore" on public.mount_rushmore for select using (true);
create policy "Users can manage their own mount_rushmore" on public.mount_rushmore for all using (auth.uid() = user_id);
grant select on public.mount_rushmore to anon;
grant select, insert, update, delete on public.mount_rushmore to authenticated;
