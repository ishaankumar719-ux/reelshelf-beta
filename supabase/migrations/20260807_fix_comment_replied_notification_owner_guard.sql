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

  if v_owner is null then
    return NEW;
  end if;

  if NEW.parent_comment_id is null then
    -- Direct comment on the entry: notify the entry owner, unless they
    -- commented on their own entry.
    if v_owner <> NEW.user_id then
      insert into public.notifications
        (recipient_id, actor_id, type, reference_id, reference_type)
      values
        (v_owner, NEW.user_id, 'entry_commented', NEW.diary_entry_id::text, 'diary_entry')
      on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing
      returning id into v_id;
      if v_id is not null then perform public.dispatch_push_for_notification(v_id); end if;
    end if;
  else
    -- Reply to a comment: notify the PARENT COMMENT's author, unless
    -- they're replying to themselves. This must not depend on who owns
    -- the diary entry — the entry owner replying to a comment on their
    -- own entry is the common case, and was previously swallowed by a
    -- guard that only checked entry-owner-vs-commenter.
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
