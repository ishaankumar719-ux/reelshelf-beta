-- List likes
create table if not exists list_likes (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references user_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(list_id, user_id)
);

alter table list_likes enable row level security;

create policy "Anyone can read list_likes"
  on list_likes for select using (true);

create policy "Authenticated users can insert own likes"
  on list_likes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own likes"
  on list_likes for delete to authenticated
  using (auth.uid() = user_id);

-- List saves
create table if not exists list_saves (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references user_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(list_id, user_id)
);

alter table list_saves enable row level security;

create policy "Anyone can read list_saves"
  on list_saves for select using (true);

create policy "Authenticated users can insert own saves"
  on list_saves for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own saves"
  on list_saves for delete to authenticated
  using (auth.uid() = user_id);

-- Engagement columns on user_lists
alter table user_lists
  add column if not exists like_count integer not null default 0,
  add column if not exists save_count integer not null default 0,
  add column if not exists trending_score numeric not null default 0;
