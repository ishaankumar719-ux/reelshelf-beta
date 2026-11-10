-- Removes everything messaging_security.sql created (STAGING ONLY).
delete from public.conversations c
 where exists (select 1 from public.conversation_members m
                where m.conversation_id = c.id and m.user_id::text like 'a0000000-0000-4000-8000-00000000000%');
delete from auth.users where id::text like 'a0000000-0000-4000-8000-00000000000%';
drop schema if exists msgtest cascade;
select 'cleaned' as status;
