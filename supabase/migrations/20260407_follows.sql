create table if not exists public.followers (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.followers enable row level security;

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
