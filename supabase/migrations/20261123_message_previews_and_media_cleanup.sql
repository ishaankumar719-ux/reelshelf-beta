-- Group inbox previews name the sender, and abandoned message-media uploads
-- get cleaned up. Builds on 20261117_message_media.sql.

-- ── 1. Sender name for inbox previews ───────────────────────────────────────
-- Adds last_message_sender_name (display name, else username) as the LAST
-- column, so apps that predate it keep working unchanged. The website and the
-- iPhone app show it in group previews ("Maya: …", or "You: …" for yourself).
drop function if exists public.list_conversations(uuid);
create function public.list_conversations(p_conversation uuid default null)
returns table (
  conversation_id uuid, kind text, title text, my_status text, my_role text, invited_by uuid,
  other_user_id uuid, other_username text, other_display_name text, other_avatar_url text,
  member_count integer, last_message_body text, last_message_sender_id uuid,
  last_message_at timestamptz, unread_count integer, i_blocked boolean, can_send boolean,
  last_message_sender_name text
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
    me.status = 'active' and (c.kind = 'group' or (
      other.user_id is not null and not public.is_blocked_between(me.user_id, other.user_id)
    )),
    case when me.status = 'active' then coalesce(nullif(btrim(sp.display_name), ''), sp.username) end
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
  left join public.profiles sp on sp.id = lm.sender_id
  where me.user_id = auth.uid() and me.status in ('active', 'invited')
    and (p_conversation is null or c.id = p_conversation)
    and (p_conversation is not null or c.kind = 'group' or lm.created_at is not null)
  order by 14 desc nulls last;
$$;
revoke all on function public.list_conversations(uuid) from public, anon;
grant execute on function public.list_conversations(uuid) to authenticated;

-- ── 2. Abandoned uploads ────────────────────────────────────────────────────
-- An upload becomes a message only through send_media. If the person gives
-- up (Discard), closes the app mid-send, or the post never happens, the file
-- is left behind. Two ways it goes:
--   • the uploader deletes it themselves (Discard) while no message uses it;
--   • message-media-sweeper (Edge Function, hourly) removes any file older
--     than 24 hours that no message uses.

-- Whether a message-media object is attached to a message.
create or replace function public.message_media_in_use(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.messages m
     where m.conversation_id = public.message_media_conversation(p_name)
       and m.kind in ('image', 'video')
       and (m.attachment->>'path' = p_name or m.attachment->>'thumb_path' = p_name)
  );
$$;
revoke all on function public.message_media_in_use(text) from public, anon;
grant execute on function public.message_media_in_use(text) to authenticated;

-- Uploaders may delete their own file until a message uses it.
drop policy if exists "Uploaders delete their unsent message media" on storage.objects;
create policy "Uploaders delete their unsent message media" on storage.objects
  for delete to authenticated using (
    bucket_id = 'message-media'
    and owner_id = auth.uid()::text
    and not public.message_media_in_use(name)
  );

-- Files no message uses, older than p_min_age. Service role only (the
-- sweeper); never exposed to signed-in users.
create or replace function public.message_media_orphans(p_min_age interval default interval '24 hours', p_limit integer default 500)
returns setof text language sql stable security definer set search_path = '' as $$
  select o.name from storage.objects o
   where o.bucket_id = 'message-media'
     and o.created_at < now() - greatest(p_min_age, interval '10 minutes')
     and not public.message_media_in_use(o.name)
   order by o.created_at
   limit least(greatest(p_limit, 1), 1000);
$$;
revoke all on function public.message_media_orphans(interval, integer) from public, anon, authenticated;
grant execute on function public.message_media_orphans(interval, integer) to service_role;

-- The sweeper's trigger secret lives in the vault; the Edge Function checks
-- the header it receives against it (service role only).
create or replace function public.message_media_sweeper_check(p_secret text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(p_secret <> '' and p_secret = (
    select decrypted_secret from vault.decrypted_secrets where name = 'message_media_sweeper_secret' limit 1
  ), false);
$$;
revoke all on function public.message_media_sweeper_check(text) from public, anon, authenticated;
grant execute on function public.message_media_sweeper_check(text) to service_role;

-- The hourly schedule is in 20261123_message_media_sweeper_schedule.sql.
