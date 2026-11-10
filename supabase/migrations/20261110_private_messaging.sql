-- Private messaging: direct messages between mutual followers, private named
-- groups with invitations, blocking, message reports and an admin review
-- queue. Shared by the website and the iPhone app.
--
-- Security model
--   * Clients READ through RLS (messages, members, conversations, blocks,
--     own reports). Realtime postgres_changes is filtered by the same RLS, so
--     a user who is not an active member never receives a message event.
--   * Clients WRITE only through the SECURITY DEFINER functions below. The
--     messaging tables have no INSERT/UPDATE/DELETE policies, so direct
--     table writes from the API are denied.
--   * "Active member" = conversation_members.status = 'active'. Invited,
--     declined, left and removed members cannot read messages.
--   * DMs: one conversation per pair (dm_key is unique), started only
--     between mutual followers who have not blocked each other. Sending in an
--     existing DM is refused while either side blocks the other.
--   * Group invites: only the owner invites; invitees must be the owner's
--     mutual followers and neither side may block the other.
--   * Retries: messages are unique on (sender_id, client_id), so resending
--     the same client_id returns the original row instead of a duplicate.

-- ── Admins (report review) ──────────────────────────────────────────────────
create table if not exists public.app_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
-- No policies: only security definer functions read it.

-- Caller only, so it can't be used to probe other accounts.
create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_admins a where a.user_id = auth.uid());
$$;

-- ── Blocks ──────────────────────────────────────────────────────────────────
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;
-- Users see only the blocks they made; the blocked person is never told.
create policy "Users see their own blocks" on public.user_blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy "Users block others" on public.user_blocks
  for insert to authenticated with check (blocker_id = auth.uid());
create policy "Users unblock others" on public.user_blocks
  for delete to authenticated using (blocker_id = auth.uid());

create or replace function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

create or replace function public.are_mutual_followers(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.followers f where f.follower_id = p_a and f.following_id = p_b)
     and exists (select 1 from public.followers f where f.follower_id = p_b and f.following_id = p_a);
$$;

-- ── Conversations ───────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('direct', 'group')),
  title           text,
  -- "<smaller uuid>:<larger uuid>" for DMs; null for groups. Unique, so two
  -- simultaneous "open DM" calls always land on the same row.
  dm_key          text unique,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz,
  constraint conversations_shape check (
    (kind = 'direct' and dm_key is not null and title is null)
    or (kind = 'group' and dm_key is null and title is not null
        and char_length(btrim(title)) between 1 and 80)
  )
);
alter table public.conversations enable row level security;

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'member' check (role in ('owner', 'member')),
  status          text not null check (status in ('invited', 'active', 'declined', 'left', 'removed')),
  invited_by      uuid references auth.users(id) on delete set null,
  joined_at       timestamptz,
  status_changed_at timestamptz not null default now(),
  -- Highest message seq this member has read; drives unread counts.
  last_read_seq   bigint not null default 0,
  created_at      timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user_idx on public.conversation_members (user_id, status);
alter table public.conversation_members enable row level security;

-- Is the CALLER an active member? Used by RLS policies, so it must be
-- executable by authenticated; it never answers for another user.
create or replace function public.is_active_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = p_conversation and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

-- Active and invited members can see the conversation row (an invitee needs
-- the group's name to accept). Nobody else can.
create policy "Members see their conversations" on public.conversations
  for select to authenticated using (
    exists (
      select 1 from public.conversation_members m
      where m.conversation_id = conversations.id and m.user_id = auth.uid()
        and m.status in ('active', 'invited')
    )
  );

-- Your own membership rows (any status), plus the member list of
-- conversations you are active in.
create policy "Members see membership" on public.conversation_members
  for select to authenticated using (
    user_id = auth.uid() or public.is_active_member(conversation_id)
  );

-- ── Messages ────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid references auth.users(id) on delete set null,
  body            text not null check (char_length(btrim(body)) between 1 and 4000),
  -- Generated by the sending client; a retry reuses it.
  client_id       uuid not null,
  -- Monotonic order for pagination and unread counts.
  seq             bigint generated always as identity,
  created_at      timestamptz not null default now(),
  constraint messages_client_unique unique (sender_id, client_id)
);
create index if not exists messages_conversation_seq_idx on public.messages (conversation_id, seq desc);
alter table public.messages enable row level security;

create policy "Active members read messages" on public.messages
  for select to authenticated using (public.is_active_member(conversation_id));

-- ── Reports ─────────────────────────────────────────────────────────────────
create table if not exists public.message_reports (
  id              uuid primary key default gen_random_uuid(),
  message_id      uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reporter_id     uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  -- Snapshot, so a report survives the sender editing history later.
  message_body    text not null,
  reason          text not null check (reason in ('spam', 'harassment', 'hate', 'sexual', 'self_harm', 'other')),
  details         text check (details is null or char_length(details) <= 1000),
  status          text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  reviewed_by     uuid references auth.users(id) on delete set null,
  reviewed_at     timestamptz,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 1000),
  created_at      timestamptz not null default now(),
  constraint message_reports_once unique (message_id, reporter_id)
);
create index if not exists message_reports_status_idx on public.message_reports (status, created_at desc);
alter table public.message_reports enable row level security;
create policy "Reporters see their reports" on public.message_reports
  for select to authenticated using (reporter_id = auth.uid());
create policy "Admins see all reports" on public.message_reports
  for select to authenticated using (public.is_app_admin());

-- ── Write functions ─────────────────────────────────────────────────────────

-- Returns the one DM between the caller and p_other, creating it if needed.
create or replace function public.get_or_create_direct_conversation(p_other uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me  uuid := auth.uid();
  v_key text;
  v_id  uuid;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_other is null or p_other = v_me then raise exception 'invalid_recipient' using errcode = '22023'; end if;
  if public.is_blocked_between(v_me, p_other) then raise exception 'blocked' using errcode = '42501'; end if;

  v_key := least(v_me::text, p_other::text) || ':' || greatest(v_me::text, p_other::text);
  select c.id into v_id from public.conversations c where c.dm_key = v_key;
  if v_id is not null then return v_id; end if;

  if not public.are_mutual_followers(v_me, p_other) then
    raise exception 'not_mutual_followers' using errcode = '42501';
  end if;

  insert into public.conversations (kind, dm_key, created_by)
  values ('direct', v_key, v_me)
  on conflict (dm_key) do nothing
  returning id into v_id;

  if v_id is null then
    -- Lost a race with a simultaneous call: use the winner's row.
    select c.id into v_id from public.conversations c where c.dm_key = v_key;
  end if;

  insert into public.conversation_members (conversation_id, user_id, role, status, joined_at)
  values (v_id, v_me, 'member', 'active', now()), (v_id, p_other, 'member', 'active', now())
  on conflict (conversation_id, user_id) do nothing;

  return v_id;
end;
$$;

-- True when the Message button should show on p_other's profile.
create or replace function public.can_message(p_other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and p_other <> auth.uid()
     and not public.is_blocked_between(auth.uid(), p_other)
     and (
       public.are_mutual_followers(auth.uid(), p_other)
       or exists (
         select 1 from public.conversations c
         where c.dm_key = least(auth.uid()::text, p_other::text) || ':' || greatest(auth.uid()::text, p_other::text)
       )
     );
$$;

create or replace function public._assert_can_invite(p_inviter uuid, p_invitee uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if p_invitee is null or p_invitee = p_inviter then raise exception 'invalid_invitee' using errcode = '22023'; end if;
  if public.is_blocked_between(p_inviter, p_invitee) then raise exception 'blocked' using errcode = '42501'; end if;
  if not public.are_mutual_followers(p_inviter, p_invitee) then
    raise exception 'not_mutual_followers' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.create_group_conversation(p_title text, p_invitees uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_invitee uuid;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 80 then
    raise exception 'invalid_title' using errcode = '22023';
  end if;
  if coalesce(array_length(p_invitees, 1), 0) > 50 then raise exception 'too_many_invitees' using errcode = '22023'; end if;

  foreach v_invitee in array coalesce(p_invitees, '{}') loop
    perform public._assert_can_invite(v_me, v_invitee);
  end loop;

  insert into public.conversations (kind, title, created_by, last_message_at)
  values ('group', btrim(p_title), v_me, now())
  returning id into v_id;

  insert into public.conversation_members (conversation_id, user_id, role, status, joined_at)
  values (v_id, v_me, 'owner', 'active', now());

  insert into public.conversation_members (conversation_id, user_id, role, status, invited_by)
  select distinct v_id, i, 'member', 'invited', v_me
  from unnest(coalesce(p_invitees, '{}')) as i
  on conflict do nothing;

  return v_id;
end;
$$;

create or replace function public.invite_to_group(p_conversation uuid, p_invitees uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_invitee uuid;
begin
  if not exists (
    select 1 from public.conversation_members m join public.conversations c on c.id = m.conversation_id
    where m.conversation_id = p_conversation and m.user_id = v_me
      and m.status = 'active' and m.role = 'owner' and c.kind = 'group'
  ) then
    raise exception 'not_group_owner' using errcode = '42501';
  end if;

  foreach v_invitee in array coalesce(p_invitees, '{}') loop
    perform public._assert_can_invite(v_me, v_invitee);
    insert into public.conversation_members (conversation_id, user_id, role, status, invited_by)
    values (p_conversation, v_invitee, 'member', 'invited', v_me)
    on conflict (conversation_id, user_id) do update
      set status = 'invited', invited_by = v_me, status_changed_at = now()
      where public.conversation_members.status in ('declined', 'left', 'removed');
  end loop;
end;
$$;

create or replace function public.respond_to_group_invite(p_conversation uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_max bigint;
begin
  select coalesce(max(seq), 0) into v_max from public.messages where conversation_id = p_conversation;
  update public.conversation_members
     set status = case when p_accept then 'active' else 'declined' end,
         joined_at = case when p_accept then now() else joined_at end,
         -- History from before you joined doesn't count as unread.
         last_read_seq = case when p_accept then v_max else last_read_seq end,
         status_changed_at = now()
   where conversation_id = p_conversation and user_id = v_me and status = 'invited';
  if not found then raise exception 'no_pending_invite' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.leave_group(p_conversation uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_was_owner boolean;
begin
  select m.role = 'owner' into v_was_owner
    from public.conversation_members m join public.conversations c on c.id = m.conversation_id
   where c.kind = 'group' and m.conversation_id = p_conversation and m.user_id = v_me and m.status = 'active'
   for update of m;
  if not found then raise exception 'not_active_member' using errcode = '42501'; end if;

  update public.conversation_members
     set status = 'left', status_changed_at = now(), role = 'member'
   where conversation_id = p_conversation and user_id = v_me;

  -- Hand ownership to the longest-standing active member, if any.
  if v_was_owner then
    update public.conversation_members set role = 'owner'
     where conversation_id = p_conversation and user_id = (
       select user_id from public.conversation_members
        where conversation_id = p_conversation and status = 'active'
        order by joined_at nulls last, created_at limit 1
     );
  end if;
end;
$$;

create or replace function public.remove_group_member(p_conversation uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid();
begin
  if p_user = v_me then raise exception 'use_leave_group' using errcode = '22023'; end if;
  if not exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation and user_id = v_me and status = 'active' and role = 'owner'
  ) then
    raise exception 'not_group_owner' using errcode = '42501';
  end if;
  update public.conversation_members
     set status = 'removed', status_changed_at = now()
   where conversation_id = p_conversation and user_id = p_user and status in ('active', 'invited');
  if not found then raise exception 'not_a_member' using errcode = 'P0002'; end if;
end;
$$;

-- Idempotent on p_client_id: a retry returns the message already stored.
create or replace function public.send_message(p_conversation uuid, p_body text, p_client_id uuid)
returns public.messages language plpgsql security definer set search_path = '' as $$
declare
  v_me   uuid := auth.uid();
  v_kind text;
  v_row  public.messages;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_client_id is null then raise exception 'missing_client_id' using errcode = '22023'; end if;

  select * into v_row from public.messages where sender_id = v_me and client_id = p_client_id;
  if found then return v_row; end if;

  if not public.is_active_member(p_conversation) then
    raise exception 'not_active_member' using errcode = '42501';
  end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 4000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;

  select kind into v_kind from public.conversations where id = p_conversation;
  if v_kind = 'direct' and exists (
    select 1 from public.conversation_members m
    where m.conversation_id = p_conversation and m.user_id <> v_me
      and public.is_blocked_between(v_me, m.user_id)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  insert into public.messages (conversation_id, sender_id, body, client_id)
  values (p_conversation, v_me, btrim(p_body), p_client_id)
  on conflict (sender_id, client_id) do nothing
  returning * into v_row;

  if v_row.id is null then
    -- A simultaneous retry with the same client_id won the insert.
    select * into v_row from public.messages where sender_id = v_me and client_id = p_client_id;
    return v_row;
  end if;

  update public.conversations set last_message_at = v_row.created_at where id = p_conversation;
  update public.conversation_members set last_read_seq = greatest(last_read_seq, v_row.seq)
   where conversation_id = p_conversation and user_id = v_me;
  return v_row;
end;
$$;

-- Marks the conversation read up to p_seq (default: everything). Never moves
-- the read marker backwards, so two clients can't undo each other.
create or replace function public.mark_conversation_read(p_conversation uuid, p_seq bigint default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_target bigint;
  v_result bigint;
begin
  select coalesce(max(seq), 0) into v_target from public.messages where conversation_id = p_conversation;
  if p_seq is not null then v_target := least(v_target, p_seq); end if;
  update public.conversation_members
     set last_read_seq = greatest(last_read_seq, v_target)
   where conversation_id = p_conversation and user_id = v_me and status = 'active'
  returning last_read_seq into v_result;
  if not found then raise exception 'not_active_member' using errcode = '42501'; end if;
  return v_result;
end;
$$;

-- ── Read functions ──────────────────────────────────────────────────────────

-- The inbox: one row per conversation the caller is active in or invited to.
-- Message previews and unread counts are only computed for active members.
-- With p_conversation, returns just that conversation, including a DM that
-- has no messages yet (the inbox hides those, but the thread must open).
create or replace function public.list_conversations(p_conversation uuid default null)
returns table (
  conversation_id   uuid,
  kind              text,
  title             text,
  my_status         text,
  my_role           text,
  invited_by        uuid,
  other_user_id     uuid,
  other_username    text,
  other_display_name text,
  other_avatar_url  text,
  member_count      integer,
  last_message_body text,
  last_message_sender_id uuid,
  last_message_at   timestamptz,
  unread_count      integer,
  -- You blocked the other person (DMs). Never says whether they blocked you.
  i_blocked         boolean,
  -- Whether a send would be accepted right now (false while either side blocks).
  can_send          boolean
)
language sql stable security definer set search_path = '' as $$
  select
    c.id, c.kind, c.title, me.status, me.role, me.invited_by,
    other.user_id, op.username, op.display_name, op.avatar_url,
    (select count(*)::int from public.conversation_members x
      where x.conversation_id = c.id and x.status = 'active'),
    case when me.status = 'active' then lm.body end,
    case when me.status = 'active' then lm.sender_id end,
    coalesce(case when me.status = 'active' then lm.created_at end, me.status_changed_at, c.created_at),
    case when me.status = 'active' then (
      select count(*)::int from public.messages m
       where m.conversation_id = c.id and m.seq > me.last_read_seq
         and m.sender_id is distinct from me.user_id
    ) else 0 end,
    case when c.kind = 'direct' then exists (
      select 1 from public.user_blocks b where b.blocker_id = me.user_id and b.blocked_id = other.user_id
    ) else false end,
    me.status = 'active' and (c.kind = 'group' or not public.is_blocked_between(me.user_id, other.user_id))
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join lateral (
    select o.user_id from public.conversation_members o
     where c.kind = 'direct' and o.conversation_id = c.id and o.user_id <> me.user_id limit 1
  ) other on true
  left join public.profiles op on op.id = other.user_id
  left join lateral (
    select m.body, m.sender_id, m.created_at from public.messages m
     where m.conversation_id = c.id order by m.seq desc limit 1
  ) lm on true
  where me.user_id = auth.uid() and me.status in ('active', 'invited')
    and (p_conversation is null or c.id = p_conversation)
    -- An empty DM nobody has written in yet stays out of the inbox.
    and (p_conversation is not null or c.kind = 'group' or lm.created_at is not null)
  order by 14 desc nulls last;
$$;

-- Badge number: unread messages across active conversations + pending invites.
create or replace function public.messaging_badge_count()
returns integer language sql stable security definer set search_path = '' as $$
  select (
    select coalesce(sum((
      select count(*) from public.messages m
       where m.conversation_id = me.conversation_id and m.seq > me.last_read_seq
         and m.sender_id is distinct from me.user_id
    )), 0)::int
    from public.conversation_members me
    where me.user_id = auth.uid() and me.status = 'active'
  ) + (
    select count(*)::int from public.conversation_members
     where user_id = auth.uid() and status = 'invited'
  );
$$;

-- Members of a conversation you're active in, with profile basics.
create or replace function public.list_conversation_members(p_conversation uuid)
returns table (user_id uuid, username text, display_name text, avatar_url text, role text, status text, last_read_seq bigint)
language sql stable security definer set search_path = '' as $$
  select m.user_id, p.username, p.display_name, p.avatar_url, m.role, m.status, m.last_read_seq
    from public.conversation_members m
    left join public.profiles p on p.id = m.user_id
   where m.conversation_id = p_conversation
     and public.is_active_member(p_conversation)
     and m.status in ('active', 'invited')
   order by (m.role = 'owner') desc, p.username;
$$;

-- People the caller can DM or invite: mutual followers they haven't blocked
-- and who haven't blocked them.
create or replace function public.list_messageable_users(p_search text default null)
returns table (user_id uuid, username text, display_name text, avatar_url text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar_url
    from public.followers a
    join public.followers b on b.follower_id = a.following_id and b.following_id = a.follower_id
    join public.profiles p on p.id = a.following_id
   where a.follower_id = auth.uid()
     and p.username is not null
     and not public.is_blocked_between(auth.uid(), p.id)
     and (p_search is null or p.username ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%')
   order by p.username
   limit 50;
$$;

-- ── Blocking ────────────────────────────────────────────────────────────────
create or replace function public.block_user(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_user is null or p_user = auth.uid() then raise exception 'invalid_user' using errcode = '22023'; end if;
  insert into public.user_blocks (blocker_id, blocked_id) values (auth.uid(), p_user) on conflict do nothing;
  -- Pending group invites between the two are withdrawn.
  update public.conversation_members m set status = 'declined', status_changed_at = now()
   where m.status = 'invited'
     and ((m.user_id = auth.uid() and m.invited_by = p_user) or (m.user_id = p_user and m.invited_by = auth.uid()));
end;
$$;

create or replace function public.unblock_user(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.user_blocks where blocker_id = auth.uid() and blocked_id = p_user;
$$;

-- ── Reports ─────────────────────────────────────────────────────────────────
create or replace function public.report_message(p_message uuid, p_reason text, p_details text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_msg public.messages;
  v_id uuid;
begin
  select * into v_msg from public.messages where id = p_message;
  if not found or not public.is_active_member(v_msg.conversation_id) then
    raise exception 'message_not_found' using errcode = 'P0002';
  end if;
  if v_msg.sender_id = auth.uid() then raise exception 'cannot_report_own_message' using errcode = '22023'; end if;

  insert into public.message_reports (message_id, conversation_id, reporter_id, reported_user_id, message_body, reason, details)
  values (v_msg.id, v_msg.conversation_id, auth.uid(), v_msg.sender_id, v_msg.body, p_reason, nullif(btrim(p_details), ''))
  on conflict (message_id, reporter_id) do update set reason = excluded.reason, details = excluded.details
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.list_message_reports(p_status text default 'open')
returns table (
  id uuid, created_at timestamptz, status text, reason text, details text, message_body text,
  conversation_id uuid, reporter_id uuid, reporter_username text,
  reported_user_id uuid, reported_username text, resolution_note text, reviewed_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_app_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  return query
    select r.id, r.created_at, r.status, r.reason, r.details, r.message_body, r.conversation_id,
           r.reporter_id, rp.username, r.reported_user_id, up.username, r.resolution_note, r.reviewed_at
      from public.message_reports r
      left join public.profiles rp on rp.id = r.reporter_id
      left join public.profiles up on up.id = r.reported_user_id
     where p_status is null or r.status = p_status
     order by r.created_at desc
     limit 200;
end;
$$;

create or replace function public.review_message_report(p_report uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_app_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  if p_status not in ('reviewing', 'actioned', 'dismissed') then raise exception 'invalid_status' using errcode = '22023'; end if;
  update public.message_reports
     set status = p_status, resolution_note = nullif(btrim(p_note), ''), reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_report;
  if not found then raise exception 'report_not_found' using errcode = 'P0002'; end if;
end;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────
-- Tables: read via RLS only. Writes go through the functions above.
revoke all on public.conversations, public.conversation_members, public.messages,
              public.message_reports, public.app_admins from anon, authenticated;
grant select on public.conversations, public.conversation_members, public.messages,
                public.message_reports to authenticated;
revoke all on public.user_blocks from anon, authenticated;
grant select, insert, delete on public.user_blocks to authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'is_app_admin()', 'is_active_member(uuid)',
    'get_or_create_direct_conversation(uuid)', 'can_message(uuid)', 'create_group_conversation(text,uuid[])',
    'invite_to_group(uuid,uuid[])', 'respond_to_group_invite(uuid,boolean)', 'leave_group(uuid)',
    'remove_group_member(uuid,uuid)', 'send_message(uuid,text,uuid)', 'mark_conversation_read(uuid,bigint)',
    'list_conversations(uuid)', 'messaging_badge_count()', 'list_conversation_members(uuid)',
    'list_messageable_users(text)', 'block_user(uuid)', 'unblock_user(uuid)',
    'report_message(uuid,text,text)', 'list_message_reports(text)', 'review_message_report(uuid,text,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
-- Internal helpers: only the functions above use them. Not callable from the
-- API, so nobody can ask "has X blocked Y?".
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;
revoke all on function public.are_mutual_followers(uuid, uuid) from public, anon, authenticated;
revoke all on function public._assert_can_invite(uuid, uuid) from public, anon, authenticated;

-- ── Realtime ────────────────────────────────────────────────────────────────
-- postgres_changes events are checked against the SELECT policies above for
-- each subscriber, so only active members receive message inserts and only
-- you receive changes to your own membership row.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.conversation_members; exception when duplicate_object then null; end;
  end if;
end $$;
