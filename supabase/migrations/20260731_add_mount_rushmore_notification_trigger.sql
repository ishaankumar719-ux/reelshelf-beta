create or replace function public.on_mount_rushmore_saved()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- saveMountRushmoreForType (mobile) / ProfileEditor's save (website) both
  -- delete+insert ALL slots for one media_type in a single statement, so
  -- this fires once per inserted slot row (up to 4x per logical save).
  -- reference_id is stable across every row in that one batch (same
  -- media_type + the statement-constant NEW.created_at), so the existing
  -- notifications_dedup_idx collapses all 4 fan-out attempts into exactly
  -- one notification per follower per save — while a later, distinct save
  -- (different created_at) still notifies again, same as on_diary_entry_saved.
  insert into public.notifications (recipient_id, actor_id, type, reference_id, reference_type, created_at)
  select f.follower_id, NEW.user_id, 'followed_user_mount_rushmore', NEW.media_type || ':' || NEW.created_at::text, 'mount_rushmore', NEW.created_at
  from public.followers f
  where f.following_id = NEW.user_id and f.follower_id <> NEW.user_id
  on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing;

  return NEW;
end;
$function$;

create trigger trg_mount_rushmore_saved
after insert on public.mount_rushmore
for each row execute function public.on_mount_rushmore_saved();
