create or replace function public.on_diary_entry_reacted()
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
