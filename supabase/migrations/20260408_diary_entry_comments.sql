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

create index if not exists diary_entry_comments_diary_entry_id_idx
on public.diary_entry_comments (diary_entry_id);

create index if not exists diary_entry_comments_parent_comment_id_idx
on public.diary_entry_comments (parent_comment_id);

create index if not exists diary_entry_comments_user_id_idx
on public.diary_entry_comments (user_id);

alter table public.diary_entry_comments enable row level security;

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
