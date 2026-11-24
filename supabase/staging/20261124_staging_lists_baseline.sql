-- STAGING ONLY. Recreates production's list and watchlist tables (as of
-- 2026-11-24) so Shelves can be built against them. Never apply to production.

create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list_type text not null check (list_type in ('watchlist', 'reading_shelf')),
  media_id text not null,
  media_type text not null check (media_type in ('movie', 'tv', 'book', 'short_film')),
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
create index if not exists saved_items_user_id_idx on public.saved_items (user_id);
create index if not exists saved_items_user_id_list_type_idx on public.saved_items (user_id, list_type);
create index if not exists saved_items_user_id_added_at_idx on public.saved_items (user_id, added_at desc);
alter table public.saved_items enable row level security;
create policy "Users can view own saved items" on public.saved_items for select using (auth.uid() = user_id);
create policy "Users can insert own saved items" on public.saved_items for insert with check (auth.uid() = user_id);
create policy "Users can update own saved items" on public.saved_items for update using (auth.uid() = user_id);
create policy "Users can delete own saved items" on public.saved_items for delete using (auth.uid() = user_id);
create trigger set_saved_items_updated_at before update on public.saved_items for each row execute function public.set_updated_at();

create table if not exists public.user_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) <= 100),
  description text,
  is_public boolean not null default true,
  is_ranked boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  visibility text not null default 'public' check (visibility in ('public', 'private', 'unlisted')),
  like_count integer not null default 0,
  save_count integer not null default 0,
  trending_score numeric not null default 0
);
create index if not exists idx_user_lists_user_date on public.user_lists (user_id, created_at desc);
alter table public.user_lists enable row level security;
create policy "Allow full access to list owners" on public.user_lists for all using (auth.uid() = user_id);
create policy "Allow visibility-based read access to lists" on public.user_lists for select using (visibility in ('public', 'unlisted'));

create table if not exists public.user_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.user_lists(id) on delete cascade,
  media_type text not null check (media_type in ('movie', 'tv', 'book', 'short_film')),
  media_id text not null,
  title text not null,
  poster_url text not null,
  year text,
  rank_order integer not null,
  notes text,
  created_at timestamptz not null default now(),
  author text,
  unique (list_id, media_type, media_id)
);
create index if not exists idx_user_list_items_ordered on public.user_list_items (list_id, rank_order);
alter table public.user_list_items enable row level security;
create policy "Allow full item access to list owners" on public.user_list_items for all using (
  exists (select 1 from public.user_lists where user_lists.id = user_list_items.list_id and user_lists.user_id = auth.uid()));
create policy "Allow visibility-based read access to list items" on public.user_list_items for select using (
  exists (select 1 from public.user_lists where user_lists.id = user_list_items.list_id and user_lists.visibility in ('public', 'unlisted')));

create table if not exists public.list_likes (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.user_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (list_id, user_id)
);
alter table public.list_likes enable row level security;
create policy "Anyone can read list_likes" on public.list_likes for select using (true);
create policy "Authenticated users can insert own likes" on public.list_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can delete own likes" on public.list_likes for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.list_saves (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.user_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (list_id, user_id)
);
alter table public.list_saves enable row level security;
create policy "Users can view own saved lists" on public.list_saves for select using (auth.uid() = user_id);
create policy "Authenticated users can insert own saves" on public.list_saves for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can delete own saves" on public.list_saves for delete to authenticated using (auth.uid() = user_id);

create or replace function public.update_list_items_order(payload jsonb)
returns void language plpgsql security definer set search_path to 'public' as $$
declare item_record jsonb;
begin
  for item_record in select * from jsonb_array_elements(payload) loop
    update public.user_list_items uli set rank_order = (item_record->>'rank_order')::int
     where uli.id = (item_record->>'id')::uuid
       and exists (select 1 from public.user_lists ul where ul.id = uli.list_id and ul.user_id = auth.uid());
  end loop;
end;
$$;

create or replace function public.update_list_engagement_counts(p_list_id uuid, p_like_count integer, p_save_count integer, p_trending_score numeric)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_like_count integer; v_save_count integer; v_has_recent_activity boolean;
begin
  select count(*) into v_like_count from public.list_likes where list_id = p_list_id;
  select count(*) into v_save_count from public.list_saves where list_id = p_list_id;
  select exists (select 1 from public.list_likes where list_id = p_list_id and created_at >= now() - interval '7 days')
      or exists (select 1 from public.list_saves where list_id = p_list_id and created_at >= now() - interval '7 days')
    into v_has_recent_activity;
  update public.user_lists set like_count = v_like_count, save_count = v_save_count,
         trending_score = v_like_count * 2 + v_save_count * 3 + (case when v_has_recent_activity then 10 else 0 end)
   where id = p_list_id;
end;
$$;
