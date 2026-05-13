-- Badge catalog: single source of truth for all badge definitions
create table if not exists public.badges (
  id                uuid        primary key default gen_random_uuid(),
  slug              text        not null unique,
  name              text        not null,
  description       text        not null,
  category          text        not null check (category in ('film','tv','book','cinema','reviews','streaks','social','prestige')),
  rarity            text        not null check (rarity in ('common','rare','epic','legendary')),
  icon              text        not null default '🏅',
  hidden            boolean     not null default false,
  requirement_type  text        not null,
  requirement_value integer     not null default 1,
  xp                integer     not null default 50,
  created_at        timestamptz not null default now()
);

-- User badge unlocks: records when each badge was earned
create table if not exists public.user_badges (
  user_id        uuid        not null references auth.users (id) on delete cascade,
  badge_id       uuid        not null references public.badges (id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  progress_value integer     not null default 0,
  showcased      boolean     not null default false,
  primary key    (user_id, badge_id)
);

create index if not exists user_badges_user_id_idx       on public.user_badges (user_id);
create index if not exists user_badges_unlocked_at_idx   on public.user_badges (user_id, unlocked_at desc);
create index if not exists user_badges_showcased_idx     on public.user_badges (user_id, showcased);

alter table public.badges      enable row level security;
alter table public.user_badges enable row level security;

-- Badge definitions are public read
drop policy if exists "Anyone can read badges"         on public.badges;
create policy "Anyone can read badges"
  on public.badges for select using (true);

-- User badges: fully public read (profile privacy is handled at the app layer)
drop policy if exists "Public can read user_badges"    on public.user_badges;
create policy "Public can read user_badges"
  on public.user_badges for select using (true);

drop policy if exists "Users can insert own user_badges" on public.user_badges;
create policy "Users can insert own user_badges"
  on public.user_badges for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own user_badges" on public.user_badges;
create policy "Users can update own user_badges"
  on public.user_badges for update to authenticated
  using (auth.uid() = user_id);
