-- ─── review_reactions ──────────────────────────────────────────────────────────
-- Generalised reaction table supporting multiple review target types.
-- One record per (target_type, target_id, user_id, reaction_type).
-- Unique constraint prevents duplicates; toggle is delete-then-insert.

create table if not exists public.review_reactions (
  id             uuid        primary key default gen_random_uuid(),
  target_type    text        not null
                   check (target_type in (
                     'film_review',
                     'tv_review',
                     'episode_review',
                     'book_review',
                     'diary_entry'
                   )),
  target_id      uuid        not null,
  user_id        uuid        not null references auth.users(id) on delete cascade,
  reaction_type  text        not null
                   check (reaction_type in (
                     'love',
                     'fire',
                     'cinema',
                     'funny',
                     'mind_blown'
                   )),
  created_at     timestamptz not null default now(),
  unique (target_type, target_id, user_id, reaction_type)
);

create index if not exists review_reactions_target_idx
  on public.review_reactions (target_type, target_id);

create index if not exists review_reactions_user_idx
  on public.review_reactions (user_id);

alter table public.review_reactions enable row level security;

drop policy if exists "Users can read all review reactions"
  on public.review_reactions;
create policy "Users can read all review reactions"
  on public.review_reactions
  for select
  using (true);

drop policy if exists "Users can insert their own review reactions"
  on public.review_reactions;
create policy "Users can insert their own review reactions"
  on public.review_reactions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own review reactions"
  on public.review_reactions;
create policy "Users can delete their own review reactions"
  on public.review_reactions
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ─── Notification trigger ─────────────────────────────────────────────────────
-- Fires after a review reaction is inserted.
-- Skips self-reactions (actor = entry owner).
-- Reuses the existing 'review_liked' notification type.
-- target_id is always a diary_entries.id UUID.

create or replace function public.on_review_reaction_inserted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  -- Look up the diary entry owner via target_id
  select user_id into v_owner
  from public.diary_entries
  where id = NEW.target_id;

  -- Skip if entry not found or reactor is the owner
  if v_owner is null or v_owner = NEW.user_id then
    return NEW;
  end if;

  insert into public.notifications
    (recipient_id, actor_id, type, reference_id, reference_type)
  values
    (v_owner, NEW.user_id, 'review_liked', NEW.target_id::text, 'diary_entry')
  on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing;

  return NEW;
end;
$$;

drop trigger if exists trg_review_reaction_inserted on public.review_reactions;
create trigger trg_review_reaction_inserted
  after insert on public.review_reactions
  for each row execute function public.on_review_reaction_inserted();
