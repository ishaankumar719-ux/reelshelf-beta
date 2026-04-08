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

create index if not exists weekly_challenge_progress_week_start_idx
on public.weekly_challenge_progress (week_start desc);

alter table public.weekly_challenge_progress enable row level security;

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
