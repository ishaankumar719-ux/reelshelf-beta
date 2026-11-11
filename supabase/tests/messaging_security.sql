-- Messaging security tests. STAGING ONLY: creates synthetic users (no
-- passwords) with fixed ids, runs every check while impersonating them via
-- request.jwt.claims + role authenticated and prints a pass/fail table.
-- messaging_security_cleanup.sql removes everything it created. Run the
-- whole file as one statement batch
-- (e.g. Supabase SQL editor or execute_sql) against a staging project that
-- has supabase/migrations/20261110_private_messaging.sql and
-- 20261111_message_title_shares.sql applied.
--
-- Cast: alice <-> bob, alice <-> carol, alice <-> erin are mutual followers.
-- dave follows alice only (not mutual). mallory knows nobody. erin blocks
-- alice part-way through. admin is in app_admins.

create schema if not exists msgtest;
grant usage on schema msgtest to authenticated;
create table if not exists msgtest.results (n serial, check_name text, passed boolean, detail text);
truncate msgtest.results;
grant all on msgtest.results to authenticated;
grant usage, select on sequence msgtest.results_n_seq to authenticated;

create or replace function msgtest.act(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function msgtest.ok(p_name text, p_passed boolean, p_detail text default null) returns void
language sql as $$ insert into msgtest.results (check_name, passed, detail) values (p_name, coalesce(p_passed, false), p_detail); $$;

-- Runs p_sql and records a pass when it raises an error whose message contains p_expect.
create or replace function msgtest.expect_error(p_name text, p_sql text, p_expect text) returns void language plpgsql as $$
begin
  execute p_sql;
  perform msgtest.ok(p_name, false, 'no error raised');
exception when others then
  perform msgtest.ok(p_name, sqlerrm ilike '%' || p_expect || '%', sqlerrm);
end $$;
grant execute on all functions in schema msgtest to authenticated;

-- ── Fixtures (as postgres) ────────────────────────────────────────────────
insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-4000-8000-000000000001', 'alice@msgtest.invalid',   'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000002', 'bob@msgtest.invalid',     'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000003', 'carol@msgtest.invalid',   'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000004', 'dave@msgtest.invalid',    'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000005', 'erin@msgtest.invalid',    'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000006', 'mallory@msgtest.invalid', 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000007', 'admin@msgtest.invalid',   'authenticated', 'authenticated')
on conflict (id) do nothing;
update public.profiles p set username = split_part(p.email, '@', 1)
 where p.id::text like 'a0000000-0000-4000-8000-00000000000%';
insert into public.followers (follower_id, following_id) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'),
  ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005'),
  ('a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001')
on conflict do nothing;
insert into public.app_admins (user_id) values ('a0000000-0000-4000-8000-000000000007') on conflict do nothing;

create table if not exists msgtest.ids (k text primary key, v uuid);
truncate msgtest.ids;
grant all on msgtest.ids to authenticated;

-- ── Direct messages ───────────────────────────────────────────────────────
do $$
declare
  alice uuid := 'a0000000-0000-4000-8000-000000000001';
  bob   uuid := 'a0000000-0000-4000-8000-000000000002';
  dave  uuid := 'a0000000-0000-4000-8000-000000000004';
  mallory uuid := 'a0000000-0000-4000-8000-000000000006';
  dm1 uuid; dm2 uuid; dm3 uuid; m1 public.messages; m1b public.messages; n int;
begin
  perform msgtest.act(alice);
  dm1 := public.get_or_create_direct_conversation(bob);
  dm2 := public.get_or_create_direct_conversation(bob);
  perform msgtest.ok('DM: reopening returns the same conversation', dm1 = dm2);
  insert into msgtest.ids values ('dm_ab', dm1);

  perform msgtest.act(bob);
  dm3 := public.get_or_create_direct_conversation(alice);
  perform msgtest.ok('DM: the other person opening it gets the same conversation', dm1 = dm3);

  perform msgtest.act(alice);
  m1  := public.send_message(dm1, 'hello bob', 'c0000000-0000-4000-8000-000000000001');
  m1b := public.send_message(dm1, 'hello bob', 'c0000000-0000-4000-8000-000000000001');
  select count(*) into n from public.messages where conversation_id = dm1;
  perform msgtest.ok('Retry with the same client id does not duplicate', m1.id = m1b.id and n = 1, format('%s rows', n));

  perform msgtest.act(bob);
  select unread_count into n from public.list_conversations() where conversation_id = dm1;
  perform msgtest.ok('Unread: recipient sees 1 unread', n = 1, n::text);
  perform msgtest.ok('Badge: recipient badge is 1', public.messaging_badge_count() = 1);
  perform public.mark_conversation_read(dm1);
  perform msgtest.ok('Badge: reading clears it', public.messaging_badge_count() = 0);
  perform public.mark_conversation_read(dm1, 0);
  perform msgtest.ok('Read marker never moves backwards', public.messaging_badge_count() = 0);

  perform msgtest.act(alice);
  perform msgtest.ok('Sender has no unread for own message',
    (select unread_count from public.list_conversations() where conversation_id = dm1) = 0);

  perform msgtest.act(dave);
  perform msgtest.expect_error('DM: one-way follower cannot start a DM',
    format('select public.get_or_create_direct_conversation(%L)', alice), 'not_mutual_followers');

  perform msgtest.act(mallory);
  select count(*) into n from public.messages where conversation_id = dm1;
  perform msgtest.ok('Outsider cannot read DM messages (RLS)', n = 0, n::text);
  select count(*) into n from public.conversations where id = dm1;
  perform msgtest.ok('Outsider cannot see the DM conversation row', n = 0);
  select count(*) into n from public.conversation_members where conversation_id = dm1;
  perform msgtest.ok('Outsider cannot see DM membership', n = 0);
  perform msgtest.expect_error('Outsider cannot send into the DM',
    format('select public.send_message(%L, %L, gen_random_uuid())', dm1, 'hi'), 'not_active_member');
  perform msgtest.expect_error('Direct table insert is denied',
    format('insert into public.messages (conversation_id, sender_id, body, client_id) values (%L, %L, %L, gen_random_uuid())', dm1, mallory, 'x'),
    'permission denied');
  perform msgtest.expect_error('Direct membership insert is denied',
    format('insert into public.conversation_members (conversation_id, user_id, status) values (%L, %L, %L)', dm1, mallory, 'active'),
    'permission denied');
  perform msgtest.expect_error('Block-state helper is not callable from the API',
    format('select public.is_blocked_between(%L, %L)', alice, bob), 'permission denied');
  reset role;
end $$;

-- ── Blocking ──────────────────────────────────────────────────────────────
do $$
declare
  alice uuid := 'a0000000-0000-4000-8000-000000000001';
  erin  uuid := 'a0000000-0000-4000-8000-000000000005';
  dm uuid; n int; ib boolean; cs boolean;
begin
  perform msgtest.act(alice);
  dm := public.get_or_create_direct_conversation(erin);
  perform public.send_message(dm, 'hi erin', gen_random_uuid());
  insert into msgtest.ids values ('dm_ae', dm);

  perform msgtest.act(erin);
  perform public.block_user(alice);
  perform msgtest.expect_error('Blocked: blocker cannot send either',
    format('select public.send_message(%L, %L, gen_random_uuid())', dm, 'x'), 'blocked');

  perform msgtest.act(alice);
  perform msgtest.expect_error('Blocked: blocked person cannot continue the DM',
    format('select public.send_message(%L, %L, gen_random_uuid())', dm, 'still there?'), 'blocked');
  perform msgtest.expect_error('Blocked: blocked person cannot open a DM',
    format('select public.get_or_create_direct_conversation(%L)', erin), 'blocked');
  select i_blocked, can_send into ib, cs from public.list_conversations() where conversation_id = dm;
  perform msgtest.ok('Blocked: inbox never tells the blocked person they were blocked', ib = false and cs = false,
    format('i_blocked=%s can_send=%s', ib, cs));
  select count(*) into n from public.user_blocks;
  perform msgtest.ok('Blocked: blocked person cannot read the block row', n = 0);
  perform msgtest.ok('Blocked: Message button hidden', public.can_message(erin) = false);
  reset role;
end $$;

-- ── Groups ────────────────────────────────────────────────────────────────
do $$
declare
  alice uuid := 'a0000000-0000-4000-8000-000000000001';
  bob   uuid := 'a0000000-0000-4000-8000-000000000002';
  carol uuid := 'a0000000-0000-4000-8000-000000000003';
  dave  uuid := 'a0000000-0000-4000-8000-000000000004';
  erin  uuid := 'a0000000-0000-4000-8000-000000000005';
  mallory uuid := 'a0000000-0000-4000-8000-000000000006';
  g uuid; n int; m public.messages;
begin
  perform msgtest.act(alice);
  perform msgtest.expect_error('Group: cannot invite a non-mutual follower',
    format('select public.create_group_conversation(%L, array[%L]::uuid[])', 'Panem', dave), 'not_mutual_followers');
  perform msgtest.expect_error('Group: cannot invite someone who blocked you',
    format('select public.create_group_conversation(%L, array[%L]::uuid[])', 'Panem', erin), 'blocked');
  g := public.create_group_conversation('District 12', array[bob, carol]);
  insert into msgtest.ids values ('group', g);
  m := public.send_message(g, 'welcome, tributes', gen_random_uuid());

  -- bob and carol are invited (pending)
  perform msgtest.act(bob);
  select count(*) into n from public.messages where conversation_id = g;
  perform msgtest.ok('Group: pending invitee cannot read messages', n = 0, n::text);
  perform msgtest.ok('Group: pending invitee can see the invite in the inbox',
    exists (select 1 from public.list_conversations() where conversation_id = g and my_status = 'invited' and last_message_body is null));
  perform msgtest.expect_error('Group: pending invitee cannot send',
    format('select public.send_message(%L, %L, gen_random_uuid())', g, 'early'), 'not_active_member');
  perform msgtest.ok('Badge: pending invite counts toward the badge', public.messaging_badge_count() >= 1);
  perform public.respond_to_group_invite(g, true);
  select count(*) into n from public.messages where conversation_id = g;
  perform msgtest.ok('Group: accepted member can read', n = 1, n::text);
  perform msgtest.ok('Group: earlier history is not counted as unread',
    (select unread_count from public.list_conversations() where conversation_id = g) = 0);
  perform public.send_message(g, 'thanks', gen_random_uuid());
  perform msgtest.expect_error('Group: a member who is not the owner cannot remove people',
    format('select public.remove_group_member(%L, %L)', g, alice), 'not_group_owner');
  perform msgtest.expect_error('Group: a member who is not the owner cannot invite',
    format('select public.invite_to_group(%L, array[%L]::uuid[])', g, alice), 'not_group_owner');

  perform msgtest.act(carol);
  perform public.respond_to_group_invite(g, false);
  select count(*) into n from public.messages where conversation_id = g;
  perform msgtest.ok('Group: declined invitee cannot read', n = 0);

  perform msgtest.act(mallory);
  select count(*) into n from public.messages where conversation_id = g;
  perform msgtest.ok('Group: uninvited user cannot read', n = 0);
  select count(*) into n from public.conversations where id = g;
  perform msgtest.ok('Group: uninvited user cannot see the group', n = 0);
  perform msgtest.expect_error('Group: uninvited user cannot accept a non-existent invite',
    format('select public.respond_to_group_invite(%L, true)', g), 'no_pending_invite');
  perform msgtest.expect_error('Group: uninvited user cannot list members',
    format('select case when count(*) = 0 then 1/0 end from public.list_conversation_members(%L)', g), 'division by zero');

  perform msgtest.act(alice);
  perform public.remove_group_member(g, bob);
  perform msgtest.act(bob);
  select count(*) into n from public.messages where conversation_id = g;
  perform msgtest.ok('Group: removed member cannot read', n = 0, n::text);
  perform msgtest.expect_error('Group: removed member cannot send',
    format('select public.send_message(%L, %L, gen_random_uuid())', g, 'let me back'), 'not_active_member');
  perform msgtest.ok('Group: removed member no longer sees it in the inbox',
    not exists (select 1 from public.list_conversations() where conversation_id = g));

  -- leave + ownership transfer
  perform msgtest.act(alice);
  perform public.invite_to_group(g, array[carol]);
  perform msgtest.act(carol);
  perform public.respond_to_group_invite(g, true);
  perform msgtest.act(alice);
  perform public.leave_group(g);
  select count(*) into n from public.messages where conversation_id = g;
  perform msgtest.ok('Group: member who left cannot read', n = 0);
  perform msgtest.act(carol);
  perform msgtest.ok('Group: ownership passes to a remaining member',
    exists (select 1 from public.list_conversation_members(g) where user_id = carol and role = 'owner'));
  reset role;
end $$;

-- ── Reports and admin review ──────────────────────────────────────────────
do $$
declare
  alice uuid := 'a0000000-0000-4000-8000-000000000001';
  bob   uuid := 'a0000000-0000-4000-8000-000000000002';
  mallory uuid := 'a0000000-0000-4000-8000-000000000006';
  admin uuid := 'a0000000-0000-4000-8000-000000000007';
  dm uuid := (select v from msgtest.ids where k = 'dm_ab');
  msg uuid; r uuid; n int;
begin
  select id into msg from public.messages where conversation_id = dm limit 1;  -- alice's message

  perform msgtest.act(mallory);
  perform msgtest.expect_error('Report: outsider cannot report a message they cannot see',
    format('select public.report_message(%L, %L)', msg, 'spam'), 'message_not_found');

  perform msgtest.act(alice);
  perform msgtest.expect_error('Report: cannot report your own message',
    format('select public.report_message(%L, %L)', msg, 'spam'), 'cannot_report_own_message');

  perform msgtest.act(bob);
  r := public.report_message(msg, 'harassment', 'test report');
  perform msgtest.ok('Report: member can report', r is not null);
  perform msgtest.ok('Report: reporter sees own report', exists (select 1 from public.message_reports where id = r));
  perform msgtest.expect_error('Report: non-admin cannot open the review queue',
    'select * from public.list_message_reports()', 'not_admin');
  perform msgtest.expect_error('Report: non-admin cannot resolve reports',
    format('select public.review_message_report(%L, %L)', r, 'dismissed'), 'not_admin');

  perform msgtest.act(alice);
  select count(*) into n from public.message_reports;
  perform msgtest.ok('Report: reported user cannot see the report', n = 0);

  perform msgtest.act(admin);
  perform msgtest.ok('Report: admin sees it in the queue', exists (select 1 from public.list_message_reports('open') where id = r));
  perform public.review_message_report(r, 'actioned', 'warned sender');
  perform msgtest.ok('Report: admin can resolve it',
    exists (select 1 from public.list_message_reports('actioned') where id = r and resolution_note = 'warned sender'));
  select count(*) into n from public.messages where conversation_id = dm;
  perform msgtest.ok('Report: admins do not get blanket access to private messages', n = 0);
  reset role;
end $$;

-- ── Title shares (needs 20261111_message_title_shares.sql) ─────────────────
do $$
declare
  alice uuid := 'a0000000-0000-4000-8000-000000000001';
  bob   uuid := 'a0000000-0000-4000-8000-000000000002';
  carol uuid := 'a0000000-0000-4000-8000-000000000003';
  mallory uuid := 'a0000000-0000-4000-8000-000000000006';
  dm_ab uuid := (select v from msgtest.ids where k = 'dm_ab');
  dm_ae uuid := (select v from msgtest.ids where k = 'dm_ae');
  g uuid; cid uuid := gen_random_uuid(); s1 public.messages; s2 public.messages; n int; prev text;
begin
  perform msgtest.act(alice);
  s1 := public.share_title(dm_ab, cid, 'film', '101299', 'The Hunger Games: Catching Fire', 2013,
                           'https://image.tmdb.org/t/p/w500/abc.jpg', '  watch this  ');
  perform msgtest.ok('Share: stores a title card with type, stable id and artwork',
    s1.kind = 'title' and s1.attachment->>'media_type' = 'film' and s1.attachment->>'media_id' = '101299'
      and (s1.attachment->>'year')::int = 2013 and s1.attachment->>'poster_url' like 'https://image.tmdb.org/%'
      and s1.attachment->>'note' = 'watch this',
    s1.attachment::text);
  perform msgtest.ok('Share: older apps get a readable fallback with the note',
    s1.body = 'Shared a film: The Hunger Games: Catching Fire · watch this', s1.body);
  s2 := public.share_title(dm_ab, cid, 'film', '101299', 'The Hunger Games: Catching Fire', 2013, null, 'watch this');
  select count(*) into n from public.messages where sender_id = alice and client_id = cid;
  perform msgtest.ok('Share: a retry with the same client id stores one message', s2.id = s1.id and n = 1);

  s1 := public.share_title(dm_ab, gen_random_uuid(), 'book', 'OL5735360W', 'Catching Fire', 2009,
                           'javascript:alert(1)', null);
  perform msgtest.ok('Share: artwork from an unknown source is dropped',
    s1.attachment->'poster_url' = 'null'::jsonb and s1.body = 'Shared a book: Catching Fire', s1.attachment::text);
  perform msgtest.ok('Share: TV label in the fallback',
    (public.share_title(dm_ab, gen_random_uuid(), 'tv', '1399', 'Game of Thrones')).body = 'Shared a TV show: Game of Thrones');

  perform msgtest.expect_error('Share: unknown media type refused',
    format('select public.share_title(%L, gen_random_uuid(), %L, %L, %L)', dm_ab, 'podcast', '1', 'x'), 'invalid_media_type');
  perform msgtest.expect_error('Share: non-numeric film id refused',
    format('select public.share_title(%L, gen_random_uuid(), %L, %L, %L)', dm_ab, 'film', 'abc', 'x'), 'invalid_media_id');
  perform msgtest.expect_error('Share: empty title refused',
    format('select public.share_title(%L, gen_random_uuid(), %L, %L, %L)', dm_ab, 'book', 'OL1W', '  '), 'invalid_media_title');
  perform msgtest.expect_error('Share: note over 500 characters refused',
    format('select public.share_title(%L, gen_random_uuid(), %L, %L, %L, null, null, %L)', dm_ab, 'film', '1', 'x', repeat('n', 501)),
    'note_too_long');

  select last_message_body into prev from public.list_conversations() where conversation_id = dm_ab;
  perform msgtest.ok('Share: inbox preview uses the readable fallback', prev like 'Shared a %', prev);
  perform public.share_title(dm_ab, gen_random_uuid(), 'tv', '1399', 'Game of Thrones', 2011, null, 'Worth a watch');
  select last_message_body into prev from public.list_conversations() where conversation_id = dm_ab;
  perform msgtest.ok('Share: preview separates title and note with a middle dot',
    prev = 'Shared a TV show: Game of Thrones · Worth a watch', prev);

  perform msgtest.act(bob);
  select count(*) into n from public.messages where conversation_id = dm_ab and kind = 'title';
  perform msgtest.ok('Share: recipient can read the shares (the retry made no extra row)', n = 4, n::text);
  perform msgtest.ok('Share: shares count as unread for the recipient',
    (select unread_count from public.list_conversations() where conversation_id = dm_ab) >= 4);

  perform msgtest.act(mallory);
  perform msgtest.expect_error('Share: non-member cannot share into a DM',
    format('select public.share_title(%L, gen_random_uuid(), %L, %L, %L)', dm_ab, 'film', '1', 'x'), 'not_active_member');

  perform msgtest.act(alice);
  perform msgtest.expect_error('Share: blocked recipient cannot receive a share',
    format('select public.share_title(%L, gen_random_uuid(), %L, %L, %L)', dm_ae, 'film', '1', 'x'), 'blocked');

  -- A group bob has left.
  g := public.create_group_conversation('Share test group', array[bob, carol]);
  perform msgtest.act(bob);
  perform public.respond_to_group_invite(g, true);
  perform public.share_title(g, gen_random_uuid(), 'book', 'OL5735363W', 'The Hunger Games', 2008);
  perform public.leave_group(g);
  perform msgtest.expect_error('Share: a member who left the group cannot share into it',
    format('select public.share_title(%L, gen_random_uuid(), %L, %L, %L)', g, 'film', '1', 'x'), 'not_active_member');
  perform msgtest.act(carol);
  perform msgtest.expect_error('Share: an invited (not joined) member cannot share into the group',
    format('select public.share_title(%L, gen_random_uuid(), %L, %L, %L)', g, 'film', '1', 'x'), 'not_active_member');
  select count(*) into n from public.messages where conversation_id = g;
  perform msgtest.ok('Share: an invited member cannot read group shares', n = 0);

  perform msgtest.act(alice);
  perform msgtest.ok('Share: plain send_message still stores a text message',
    (public.send_message(dm_ab, 'plain text', gen_random_uuid())).kind = 'text');
  perform msgtest.expect_error('Share: the internal insert function is not callable',
    format('select public._post_message(%L, %L, gen_random_uuid(), %L, null)', dm_ab, 'x', 'text'), 'permission denied');
  perform msgtest.expect_error('Share: clients cannot write a card directly into the table',
    format('insert into public.messages (conversation_id, sender_id, body, client_id, kind, attachment) values (%L, %L, %L, gen_random_uuid(), %L, %L)',
           dm_ab, alice, 'x', 'title', '{}'), 'permission denied');
  reset role;
  perform msgtest.ok('Share: signed-out visitors cannot call share_title',
    not has_function_privilege('anon', 'public.share_title(uuid,uuid,text,text,text,integer,text,text)', 'execute'));
end $$;

select n, passed, check_name, detail from msgtest.results order by n;
