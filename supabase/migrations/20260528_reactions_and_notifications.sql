-- ─── diary_entry_reactions ────────────────────────────────────────────────────
-- Emoji reactions on diary entries. One record per (entry, user, emoji).
-- Unique constraint prevents duplicates; toggling is delete-then-insert.

create table if not exists public.diary_entry_reactions (
  id             uuid        primary key default gen_random_uuid(),
  diary_entry_id uuid        not null references public.diary_entries(id) on delete cascade,
  user_id        uuid        not null references auth.users(id) on delete cascade,
  emoji          text        not null check (emoji in ('🔥','🎬','😭','🤯','❤️')),
  created_at     timestamptz not null default now(),
  unique (diary_entry_id, user_id, emoji)
);

create index if not exists diary_entry_reactions_entry_idx
  on public.diary_entry_reactions (diary_entry_id);

create index if not exists diary_entry_reactions_user_idx
  on public.diary_entry_reactions (user_id);

alter table public.diary_entry_reactions enable row level security;

drop policy if exists "Public can view reactions" on public.diary_entry_reactions;
create policy "Public can view reactions"
  on public.diary_entry_reactions
  for select using (true);

drop policy if exists "Users can react to others entries" on public.diary_entry_reactions;
create policy "Users can react to others entries"
  on public.diary_entry_reactions
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.diary_entries de
      join public.profiles p on p.id = de.user_id
      where de.id = diary_entry_reactions.diary_entry_id
        and p.username is not null
        and de.user_id <> auth.uid()
    )
  );

drop policy if exists "Users can remove own reactions" on public.diary_entry_reactions;
create policy "Users can remove own reactions"
  on public.diary_entry_reactions
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ─── Comment UPDATE policy (edit own comment body) ────────────────────────────

drop policy if exists "Users can update own comments" on public.diary_entry_comments;
create policy "Users can update own comments"
  on public.diary_entry_comments
  for update
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Notification trigger: like ───────────────────────────────────────────────
-- Fires after a like is inserted. Skips self-likes (RLS already prevents them,
-- but the guard here makes the function safe regardless).

create or replace function public.on_diary_entry_liked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner
  from public.diary_entries
  where id = NEW.diary_entry_id;

  if v_owner is null or v_owner = NEW.user_id then
    return NEW;
  end if;

  insert into public.notifications
    (recipient_id, actor_id, type, reference_id, reference_type)
  values
    (v_owner, NEW.user_id, 'review_liked', NEW.diary_entry_id::text, 'diary_entry')
  on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing;

  return NEW;
end;
$$;

drop trigger if exists trg_diary_entry_liked on public.diary_entry_likes;
create trigger trg_diary_entry_liked
  after insert on public.diary_entry_likes
  for each row execute function public.on_diary_entry_liked();

-- ─── Notification trigger: comment ───────────────────────────────────────────
-- Fires when a root comment (no parent) is added. Replies trigger comment_replied.

create or replace function public.on_diary_entry_commented()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner
  from public.diary_entries
  where id = NEW.diary_entry_id;

  if v_owner is null or v_owner = NEW.user_id then
    return NEW;
  end if;

  if NEW.parent_comment_id is null then
    -- New root comment → notify entry owner
    insert into public.notifications
      (recipient_id, actor_id, type, reference_id, reference_type)
    values
      (v_owner, NEW.user_id, 'entry_commented', NEW.diary_entry_id::text, 'diary_entry')
    on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing;
  else
    -- Reply → notify parent comment author (if different from replier)
    declare
      v_parent_author uuid;
    begin
      select user_id into v_parent_author
      from public.diary_entry_comments
      where id = NEW.parent_comment_id;

      if v_parent_author is not null and v_parent_author <> NEW.user_id then
        insert into public.notifications
          (recipient_id, actor_id, type, reference_id, reference_type)
        values
          (v_parent_author, NEW.user_id, 'comment_replied', NEW.diary_entry_id::text, 'diary_entry')
        on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing;
      end if;
    end;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_diary_entry_commented on public.diary_entry_comments;
create trigger trg_diary_entry_commented
  after insert on public.diary_entry_comments
  for each row execute function public.on_diary_entry_commented();

-- ─── Notification trigger: reaction ──────────────────────────────────────────
-- Reuses review_liked type — reactions are a superset of appreciation signals.

create or replace function public.on_diary_entry_reacted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner
  from public.diary_entries
  where id = NEW.diary_entry_id;

  if v_owner is null or v_owner = NEW.user_id then
    return NEW;
  end if;

  insert into public.notifications
    (recipient_id, actor_id, type, reference_id, reference_type)
  values
    (v_owner, NEW.user_id, 'review_liked', NEW.diary_entry_id::text, 'diary_entry')
  on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing;

  return NEW;
end;
$$;

drop trigger if exists trg_diary_entry_reacted on public.diary_entry_reactions;
create trigger trg_diary_entry_reacted
  after insert on public.diary_entry_reactions
  for each row execute function public.on_diary_entry_reacted();
