-- Extends every existing notification-dispatch trigger to also call
-- dispatch_push_for_notification() after each insert — same 7 real
-- notification types, no separate push-only channel. Each function is
-- otherwise byte-for-byte identical to its prior definition; only the
-- push-dispatch call is added, right after (never instead of) the
-- notifications insert.

create or replace function public.on_new_follower()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
begin
  insert into public.notifications (recipient_id, actor_id, type, reference_id, reference_type)
  values (NEW.following_id, NEW.follower_id, 'new_follower', NEW.id::text, 'follower')
  on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing
  returning id into v_id;
  if v_id is not null then perform public.dispatch_push_for_notification(v_id); end if;
  return NEW;
end;
$function$;

create or replace function public.on_diary_entry_saved()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  notif_type text;
  v_id uuid;
begin
  notif_type := case
    when trim(coalesce(NEW.review, '')) <> '' then 'followed_user_reviewed'
    else 'followed_user_logged'
  end;

  for v_id in
    insert into public.notifications (recipient_id, actor_id, type, reference_id, reference_type, created_at)
    select f.follower_id, NEW.user_id, notif_type, NEW.id::text, 'diary_entry', NEW.created_at
    from public.followers f
    where f.following_id = NEW.user_id and f.follower_id <> NEW.user_id
    on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing
    returning id
  loop
    perform public.dispatch_push_for_notification(v_id);
  end loop;

  return NEW;
end;
$function$;

create or replace function public.on_diary_entry_liked()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_owner uuid;
  v_id uuid;
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
  on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing
  returning id into v_id;
  if v_id is not null then perform public.dispatch_push_for_notification(v_id); end if;

  return NEW;
end;
$function$;

create or replace function public.on_diary_entry_commented()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_owner uuid;
  v_id uuid;
begin
  select user_id into v_owner
  from public.diary_entries
  where id = NEW.diary_entry_id;

  if v_owner is null or v_owner = NEW.user_id then
    return NEW;
  end if;

  if NEW.parent_comment_id is null then
    insert into public.notifications
      (recipient_id, actor_id, type, reference_id, reference_type)
    values
      (v_owner, NEW.user_id, 'entry_commented', NEW.diary_entry_id::text, 'diary_entry')
    on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing
    returning id into v_id;
    if v_id is not null then perform public.dispatch_push_for_notification(v_id); end if;
  else
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
        on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing
        returning id into v_id;
        if v_id is not null then perform public.dispatch_push_for_notification(v_id); end if;
      end if;
    end;
  end if;

  return NEW;
end;
$function$;

create or replace function public.on_mount_rushmore_saved()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
begin
  for v_id in
    insert into public.notifications (recipient_id, actor_id, type, reference_id, reference_type, created_at)
    select f.follower_id, NEW.user_id, 'followed_user_mount_rushmore', NEW.media_type || ':' || NEW.created_at::text, 'mount_rushmore', NEW.created_at
    from public.followers f
    where f.following_id = NEW.user_id and f.follower_id <> NEW.user_id
    on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing
    returning id
  loop
    perform public.dispatch_push_for_notification(v_id);
  end loop;

  return NEW;
end;
$function$;

create or replace function public.on_review_comment_inserted()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_owner uuid;
  v_id uuid;
begin
  select user_id into v_owner
  from public.diary_entries
  where id = NEW.target_id;

  if v_owner is null or v_owner = NEW.user_id then
    return NEW;
  end if;

  insert into public.notifications
    (recipient_id, actor_id, type, reference_id, reference_type)
  values
    (v_owner, NEW.user_id, 'entry_commented', NEW.target_id::text, 'diary_entry')
  on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing
  returning id into v_id;
  if v_id is not null then perform public.dispatch_push_for_notification(v_id); end if;

  return NEW;
end;
$function$;

create or replace function public.on_review_reaction_inserted()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_owner uuid;
  v_id uuid;
begin
  select user_id into v_owner
  from public.diary_entries
  where id = NEW.target_id;

  if v_owner is null or v_owner = NEW.user_id then
    return NEW;
  end if;

  insert into public.notifications
    (recipient_id, actor_id, type, reference_id, reference_type)
  values
    (v_owner, NEW.user_id, 'review_liked', NEW.target_id::text, 'diary_entry')
  on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing
  returning id into v_id;
  if v_id is not null then perform public.dispatch_push_for_notification(v_id); end if;

  return NEW;
end;
$function$;
