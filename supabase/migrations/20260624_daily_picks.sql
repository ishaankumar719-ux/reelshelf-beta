create table if not exists public.daily_picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pick_date date not null default current_date,
  media_type text not null check (media_type in ('film', 'tv', 'book')),
  media_id text not null,
  reroll_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, pick_date)
);

alter table public.daily_picks enable row level security;

drop policy if exists "Users can read own daily picks" on public.daily_picks;
create policy "Users can read own daily picks"
  on public.daily_picks
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own daily picks" on public.daily_picks;
create policy "Users can insert own daily picks"
  on public.daily_picks
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own daily picks" on public.daily_picks;
create policy "Users can update own daily picks"
  on public.daily_picks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
