-- Notifications table: stores persistent social notifications.
-- Types supported from day one: new_follower, followed_user_logged,
-- followed_user_reviewed, followed_user_mount_rushmore, review_liked,
-- entry_commented, comment_replied.
-- Future types (likes on comments, etc.) can be added to the CHECK constraint
-- without any structural changes — reference_id / reference_type absorb any
-- new content reference.

create table if not exists public.notifications (
  id             uuid        primary key default gen_random_uuid(),
  recipient_id   uuid        not null references auth.users(id) on delete cascade,
  actor_id       uuid        not null references auth.users(id) on delete cascade,
  type           text        not null check (type in (
                               'new_follower',
                               'followed_user_logged',
                               'followed_user_reviewed',
                               'followed_user_mount_rushmore',
                               'review_liked',
                               'entry_commented',
                               'comment_replied'
                             )),
  reference_id   text,
  reference_type text        check (reference_type in ('follower', 'diary_entry', 'mount_rushmore', 'like', 'comment')),
  read           boolean     not null default false,
  created_at     timestamptz not null default now(),
  check (actor_id <> recipient_id)
);

-- Fast lookup by recipient, newest first
create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

-- Deduplication: the same event cannot generate two notifications for the same recipient
create unique index if not exists notifications_dedup_idx
  on public.notifications (recipient_id, actor_id, type, coalesce(reference_id, ''));

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications
  for select
  using (auth.uid() = recipient_id);

drop policy if exists "Users can mark own notifications read" on public.notifications;
create policy "Users can mark own notifications read"
  on public.notifications
  for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- ─── TRIGGER: new_follower ────────────────────────────────────────────────────

create or replace function public.on_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications
    (recipient_id, actor_id, type, reference_id, reference_type)
  values
    (NEW.following_id, NEW.follower_id, 'new_follower', NEW.id::text, 'follower')
  on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing;

  return NEW;
end;
$$;

drop trigger if exists trg_new_follower on public.followers;
create trigger trg_new_follower
  after insert on public.followers
  for each row execute function public.on_new_follower();

-- ─── TRIGGER: diary entry saved → notify followers ───────────────────────────

create or replace function public.on_diary_entry_saved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  notif_type text;
begin
  notif_type := case
    when trim(coalesce(NEW.review, '')) <> '' then 'followed_user_reviewed'
    else 'followed_user_logged'
  end;

  insert into public.notifications
    (recipient_id, actor_id, type, reference_id, reference_type, created_at)
  select
    f.follower_id,
    NEW.user_id,
    notif_type,
    NEW.id::text,
    'diary_entry',
    NEW.created_at
  from public.followers f
  where f.following_id = NEW.user_id
    and f.follower_id <> NEW.user_id
  on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing;

  return NEW;
end;
$$;

drop trigger if exists trg_diary_entry_saved on public.diary_entries;
create trigger trg_diary_entry_saved
  after insert on public.diary_entries
  for each row execute function public.on_diary_entry_saved();

-- ─── BACKFILL: seed existing follow relationships ────────────────────────────

insert into public.notifications
  (recipient_id, actor_id, type, reference_id, reference_type, created_at)
select
  following_id,
  follower_id,
  'new_follower',
  id::text,
  'follower',
  created_at
from public.followers
on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing;

-- ─── BACKFILL: seed existing diary notifications for followers ────────────────

insert into public.notifications
  (recipient_id, actor_id, type, reference_id, reference_type, created_at)
select
  f.follower_id,
  de.user_id,
  case when trim(coalesce(de.review, '')) <> '' then 'followed_user_reviewed' else 'followed_user_logged' end,
  de.id::text,
  'diary_entry',
  de.created_at
from public.diary_entries de
join public.followers f on f.following_id = de.user_id
where f.follower_id <> de.user_id
on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing;
