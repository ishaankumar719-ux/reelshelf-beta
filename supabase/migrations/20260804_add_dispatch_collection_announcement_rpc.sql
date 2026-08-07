-- Called only by the local scheduling script (scripts/schedule-collection-of-the-week.ts)
-- via its service-role admin client, when run with --announce. Mirrors
-- dispatch_push_for_notification's exact secret-lookup + net.http_post
-- pattern, but for the send-push-notification Edge Function's separate
-- broadcast/collection_announcement request shape (see that function's
-- header comment) rather than a single notifications row.
create or replace function public.dispatch_collection_announcement(p_slug text, p_title text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_secret text;
  v_project_url text := 'https://gefxnqagnwcsepbksfip.supabase.co';
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if v_secret is null then return; end if;

  perform net.http_post(
    url := v_project_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    body := jsonb_build_object('collection_announcement', jsonb_build_object('slug', p_slug, 'title', p_title))
  );
end;
$function$;

-- Only the scheduling script (service_role) should ever call this — matches
-- the same lockdown already applied to dispatch_push_for_notification and
-- verify_push_webhook_secret.
revoke all on function public.dispatch_collection_announcement(text, text) from public, anon, authenticated;
grant execute on function public.dispatch_collection_announcement(text, text) to service_role;
