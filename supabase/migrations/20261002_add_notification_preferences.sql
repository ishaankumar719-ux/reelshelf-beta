-- Per-user delivery choices. Existing behaviour remains unchanged until a user
-- explicitly turns a category off, so this is safe for already-installed apps.
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  following_activity boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "Users can view own notification preferences"
  on public.notification_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own notification preferences"
  on public.notification_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notification preferences"
  on public.notification_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
    left join public.notification_preferences p on p.user_id = f.follower_id
    where f.following_id = NEW.user_id
      and f.follower_id <> NEW.user_id
      and coalesce(p.following_activity, true)
    on conflict (recipient_id, actor_id, type, coalesce(reference_id, '')) do nothing
    returning id
  loop
    perform public.dispatch_push_for_notification(v_id);
  end loop;

  return NEW;
end;
$function$;
