-- GIFs, photos and videos in Messages. Builds on
-- 20261110_private_messaging.sql and 20261111_message_title_shares.sql.
--
-- Format (the same from the website and the iPhone app):
--   messages.kind 'gif'   attachment { giphy_id, url, width, height, title }
--   messages.kind 'image' attachment { path, width, height, mime, size, caption }
--   messages.kind 'video' attachment { path, thumb_path, width, height,
--                                      duration_ms, mime, size, caption }
--   messages.body readable fallback for apps that predate these kinds
--                 ("Sent a photo" + " · " + caption), also the inbox preview.
--
-- Storage: photos and videos live in the PRIVATE bucket message-media at
--   <conversation_id>/<sender_id>/<client_id>.<ext>
--   <conversation_id>/<sender_id>/<client_id>-thumb.jpg   (video poster)
-- Every read and every upload is checked against CURRENT active membership
-- of that conversation by the storage policies below. There are no public
-- URLs: the website serves files through /api/message-media (the reader's own
-- session, so this policy runs on every request) and the iPhone app sends
-- the reader's token with each request.
--
-- Every send goes through _post_message, so membership, blocking,
-- deleted-account, idempotent retries, unread counts, previews and realtime
-- behave exactly as for text and title cards.

-- ── Message kinds ───────────────────────────────────────────────────────────
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check
  check (kind in ('text', 'title', 'gif', 'image', 'video'));

alter table public.messages drop constraint if exists messages_attachment_shape;
alter table public.messages add constraint messages_attachment_shape check (
  (kind = 'text' and attachment is null)
  or (kind <> 'text' and attachment is not null and jsonb_typeof(attachment) = 'object')
);

-- ── Private bucket ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-media', 'message-media', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The conversation a message-media object belongs to, or null if the name
-- isn't "<uuid>/<uuid>/<file>". Never raises, so a malformed name is simply
-- denied by the policies instead of erroring.
create or replace function public.message_media_conversation(p_name text)
returns uuid language plpgsql immutable set search_path = '' as $$
declare
  v_parts text[] := string_to_array(p_name, '/');
begin
  if array_length(v_parts, 1) <> 3 then return null; end if;
  if v_parts[1] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null; end if;
  return v_parts[1]::uuid;
end;
$$;

-- Read: active members of the conversation, checked on every request.
drop policy if exists "Active members read message media" on storage.objects;
create policy "Active members read message media" on storage.objects
  for select to authenticated using (
    bucket_id = 'message-media'
    and public.is_active_member(public.message_media_conversation(name))
  );

-- Upload: only into your own folder of a conversation you're active in.
-- No update or delete policies: an object is written once.
drop policy if exists "Active members upload message media" on storage.objects;
create policy "Active members upload message media" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'message-media'
    and split_part(name, '/', 2) = auth.uid()::text
    and public.is_active_member(public.message_media_conversation(name))
  );

-- ── Send a GIF ──────────────────────────────────────────────────────────────
create or replace function public.send_gif(
  p_conversation uuid,
  p_client_id    uuid,
  p_giphy_id     text,
  p_url          text,
  p_width        integer,
  p_height       integer,
  p_title        text default null
)
returns public.messages language plpgsql security definer set search_path = '' as $$
declare
  v_url   text := btrim(coalesce(p_url, ''));
  v_title text := nullif(left(btrim(coalesce(p_title, '')), 200), '');
begin
  if p_giphy_id is null or p_giphy_id !~ '^[A-Za-z0-9]{1,64}$' then
    raise exception 'invalid_gif' using errcode = '22023';
  end if;
  -- Only GIPHY's own media hosts, so a "GIF" can't point anywhere else.
  if v_url !~ '^https://(media[0-9]?\.giphy\.com|i\.giphy\.com)/' or char_length(v_url) > 1000 then
    raise exception 'invalid_gif' using errcode = '22023';
  end if;
  if p_width is null or p_height is null or p_width not between 1 and 4000 or p_height not between 1 and 4000 then
    raise exception 'invalid_gif' using errcode = '22023';
  end if;

  return public._post_message(
    p_conversation, 'Sent a GIF', p_client_id, 'gif',
    jsonb_build_object('giphy_id', p_giphy_id, 'url', v_url, 'width', p_width, 'height', p_height, 'title', v_title)
  );
end;
$$;

-- ── Send a photo or video ───────────────────────────────────────────────────
-- The file is uploaded first (storage policy: your folder, active member);
-- this then checks the stored object itself, so the size and type in the
-- message are the server's, not the client's.
create or replace function public.send_media(
  p_conversation uuid,
  p_client_id    uuid,
  p_kind         text,
  p_path         text,
  p_thumb_path   text default null,
  p_width        integer default null,
  p_height       integer default null,
  p_duration_ms  integer default null,
  p_caption      text default null
)
returns public.messages language plpgsql security definer set search_path = '' as $$
declare
  v_me      uuid := auth.uid();
  v_caption text := nullif(btrim(coalesce(p_caption, '')), '');
  v_prefix  text := p_conversation::text || '/' || v_me::text || '/';
  v_mime    text;
  v_size    bigint;
  v_tmime   text;
  v_tsize   bigint;
  v_label   text;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_kind not in ('image', 'video') then raise exception 'invalid_media' using errcode = '22023'; end if;
  if v_caption is not null and char_length(v_caption) > 1000 then
    raise exception 'caption_too_long' using errcode = '22023';
  end if;

  -- A retry of a message already stored returns it (before re-checking files).
  if exists (select 1 from public.messages where sender_id = v_me and client_id = p_client_id) then
    return public._post_message(p_conversation, 'x', p_client_id, p_kind, '{}'::jsonb);
  end if;

  if p_path is null or left(p_path, char_length(v_prefix)) <> v_prefix
     or substr(p_path, char_length(v_prefix) + 1) !~ '^[A-Za-z0-9_-]{1,80}\.(jpg|jpeg|png|webp|gif|mp4|mov)$' then
    raise exception 'invalid_media' using errcode = '22023';
  end if;

  select o.metadata->>'mimetype', (o.metadata->>'size')::bigint into v_mime, v_size
    from storage.objects o
   where o.bucket_id = 'message-media' and o.name = p_path
     and (o.owner_id = v_me::text or o.owner = v_me);
  if not found then raise exception 'media_not_uploaded' using errcode = 'P0002'; end if;

  if p_kind = 'image' then
    if v_mime not in ('image/jpeg', 'image/png', 'image/webp', 'image/gif') then raise exception 'invalid_media' using errcode = '22023'; end if;
    if v_size > 10485760 then raise exception 'media_too_large' using errcode = '22023'; end if;
    if p_thumb_path is not null then raise exception 'invalid_media' using errcode = '22023'; end if;
    v_label := 'Sent a photo';
  else
    if v_mime not in ('video/mp4', 'video/quicktime') then raise exception 'invalid_media' using errcode = '22023'; end if;
    if v_size > 52428800 then raise exception 'media_too_large' using errcode = '22023'; end if;
    if p_thumb_path is null or left(p_thumb_path, char_length(v_prefix)) <> v_prefix
       or substr(p_thumb_path, char_length(v_prefix) + 1) !~ '^[A-Za-z0-9_-]{1,80}\.jpg$' then
      raise exception 'invalid_media' using errcode = '22023';
    end if;
    select o.metadata->>'mimetype', (o.metadata->>'size')::bigint into v_tmime, v_tsize
      from storage.objects o
     where o.bucket_id = 'message-media' and o.name = p_thumb_path
       and (o.owner_id = v_me::text or o.owner = v_me);
    if not found then raise exception 'media_not_uploaded' using errcode = 'P0002'; end if;
    if v_tmime <> 'image/jpeg' or v_tsize > 2097152 then raise exception 'invalid_media' using errcode = '22023'; end if;
    if p_duration_ms is not null and p_duration_ms not between 0 and 3600000 then
      raise exception 'invalid_media' using errcode = '22023';
    end if;
    v_label := 'Sent a video';
  end if;

  if p_width is not null and p_width not between 1 and 20000 then raise exception 'invalid_media' using errcode = '22023'; end if;
  if p_height is not null and p_height not between 1 and 20000 then raise exception 'invalid_media' using errcode = '22023'; end if;

  return public._post_message(
    p_conversation,
    v_label || coalesce(' · ' || v_caption, ''),
    p_client_id,
    p_kind,
    jsonb_build_object(
      'path', p_path, 'thumb_path', p_thumb_path,
      'width', p_width, 'height', p_height, 'duration_ms', p_duration_ms,
      'mime', v_mime, 'size', v_size, 'caption', v_caption
    )
  );
end;
$$;

revoke all on function public.message_media_conversation(text) from public, anon;
grant execute on function public.message_media_conversation(text) to authenticated;
revoke all on function public.send_gif(uuid, uuid, text, text, integer, integer, text) from public, anon;
grant execute on function public.send_gif(uuid, uuid, text, text, integer, integer, text) to authenticated;
revoke all on function public.send_media(uuid, uuid, text, text, text, integer, integer, integer, text) from public, anon;
grant execute on function public.send_media(uuid, uuid, text, text, text, integer, integer, integer, text) to authenticated;
