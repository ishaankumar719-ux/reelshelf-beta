-- Title shares in Messages: a film, TV show or book sent to a DM or group as
-- a tappable card. Builds on 20261110_private_messaging.sql.
--
-- Format (the same from the website and the iPhone app):
--   messages.kind       'title' (plain messages stay 'text')
--   messages.attachment { media_type: 'film' | 'tv' | 'book',
--                         media_id:   TMDB id (film, tv) or the stable book id:
--                                     Open Library work id ("OL5735360W") for
--                                     catalogued books such as the Hunger Games
--                                     novels, otherwise the id Search uses,
--                                     title, year, poster_url, note }
--   messages.body       readable fallback for clients that predate cards:
--                       "Shared a film: Catching Fire" (+ "\n" + note)
--
-- Every share goes through the same insert path as a text message
-- (_post_message), so membership, blocking, deleted-account, idempotent
-- retries, unread counts, previews and realtime behave identically.

alter table public.messages add column if not exists kind text not null default 'text';
alter table public.messages add column if not exists attachment jsonb;
do $$
begin
  alter table public.messages add constraint messages_kind_check check (kind in ('text', 'title'));
exception when duplicate_object then null;
end $$;
do $$
begin
  alter table public.messages add constraint messages_attachment_shape check (
    (kind = 'text' and attachment is null)
    or (kind = 'title' and attachment is not null and jsonb_typeof(attachment) = 'object')
  );
exception when duplicate_object then null;
end $$;

-- The single write path for every message. Internal: send_message and
-- share_title call it; it is not exposed through the API.
create or replace function public._post_message(
  p_conversation uuid, p_body text, p_client_id uuid, p_kind text, p_attachment jsonb
)
returns public.messages language plpgsql security definer set search_path = '' as $$
declare
  v_me   uuid := auth.uid();
  v_kind text;
  v_row  public.messages;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_client_id is null then raise exception 'missing_client_id' using errcode = '22023'; end if;

  -- A retry returns the message already stored.
  select * into v_row from public.messages where sender_id = v_me and client_id = p_client_id;
  if found then return v_row; end if;

  if not public.is_active_member(p_conversation) then
    raise exception 'not_active_member' using errcode = '42501';
  end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 4000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;

  select kind into v_kind from public.conversations where id = p_conversation;
  -- A DM whose other person deleted their account stays readable, not writable.
  if v_kind = 'direct' and not exists (
    select 1 from public.conversation_members m where m.conversation_id = p_conversation and m.user_id <> v_me
  ) then
    raise exception 'recipient_unavailable' using errcode = '42501';
  end if;
  if v_kind = 'direct' and exists (
    select 1 from public.conversation_members m
    where m.conversation_id = p_conversation and m.user_id <> v_me
      and public.is_blocked_between(v_me, m.user_id)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  insert into public.messages (conversation_id, sender_id, body, client_id, kind, attachment)
  values (p_conversation, v_me, btrim(p_body), p_client_id, p_kind, p_attachment)
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

-- Unchanged contract: same name, arguments and errors as before.
create or replace function public.send_message(p_conversation uuid, p_body text, p_client_id uuid)
returns public.messages language plpgsql security definer set search_path = '' as $$
begin
  return public._post_message(p_conversation, p_body, p_client_id, 'text', null);
end;
$$;

-- Shares one title to one conversation. The server builds the fallback text
-- and the attachment, so a client can't send a card that says one thing and
-- reads as another on older apps.
create or replace function public.share_title(
  p_conversation uuid,
  p_client_id    uuid,
  p_media_type   text,
  p_media_id     text,
  p_title        text,
  p_year         integer default null,
  p_poster_url   text default null,
  p_note         text default null
)
returns public.messages language plpgsql security definer set search_path = '' as $$
declare
  v_title  text := btrim(coalesce(p_title, ''));
  v_note   text := nullif(btrim(coalesce(p_note, '')), '');
  v_poster text := btrim(coalesce(p_poster_url, ''));
  v_label  text;
begin
  if p_media_type = 'film' then v_label := 'film';
  elsif p_media_type = 'tv' then v_label := 'TV show';
  elsif p_media_type = 'book' then v_label := 'book';
  else raise exception 'invalid_media_type' using errcode = '22023';
  end if;

  if p_media_id is null or not (
    (p_media_type in ('film', 'tv') and p_media_id ~ '^[0-9]{1,10}$')
    or (p_media_type = 'book' and p_media_id ~ '^[A-Za-z0-9_-]{2,64}$')
  ) then
    raise exception 'invalid_media_id' using errcode = '22023';
  end if;
  if char_length(v_title) not between 1 and 300 then raise exception 'invalid_media_title' using errcode = '22023'; end if;
  if p_year is not null and p_year not between 1800 and 2100 then raise exception 'invalid_year' using errcode = '22023'; end if;
  if v_note is not null and char_length(v_note) > 500 then raise exception 'note_too_long' using errcode = '22023'; end if;
  -- Artwork only from the catalogues the apps already load from; anything
  -- else is dropped and the card shows the placeholder.
  if v_poster !~ '^https://(image\.tmdb\.org|covers\.openlibrary\.org|books\.google\.com|books\.googleusercontent\.com)/'
     or char_length(v_poster) > 1000 then
    v_poster := null;
  end if;

  return public._post_message(
    p_conversation,
    'Shared a ' || v_label || ': ' || v_title || coalesce(E'\n' || v_note, ''),
    p_client_id,
    'title',
    jsonb_build_object(
      'media_type', p_media_type,
      'media_id',   p_media_id,
      'title',      v_title,
      'year',       p_year,
      'poster_url', v_poster,
      'note',       v_note
    )
  );
end;
$$;

revoke all on function public._post_message(uuid, text, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.share_title(uuid, uuid, text, text, text, integer, text, text) from public, anon;
grant execute on function public.share_title(uuid, uuid, text, text, text, integer, text, text) to authenticated;
revoke all on function public.send_message(uuid, text, uuid) from public, anon;
grant execute on function public.send_message(uuid, text, uuid) to authenticated;
