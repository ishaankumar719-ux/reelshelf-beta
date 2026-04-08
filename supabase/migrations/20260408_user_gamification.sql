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

create index if not exists user_gamification_updated_at_idx
on public.user_gamification (updated_at desc);

alter table public.user_gamification enable row level security;

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
