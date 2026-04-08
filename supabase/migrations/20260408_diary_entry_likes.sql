create table if not exists public.diary_entry_likes (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references public.diary_entries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (diary_entry_id, user_id)
);

create index if not exists diary_entry_likes_diary_entry_id_idx
on public.diary_entry_likes (diary_entry_id);

create index if not exists diary_entry_likes_user_id_idx
on public.diary_entry_likes (user_id);

alter table public.diary_entry_likes enable row level security;

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
