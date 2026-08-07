-- Fire-and-forget: called after a notification row is inserted, to also
-- trigger a real push via the send-push-notification Edge Function.
-- Never throws — a push-dispatch failure must never roll back the
-- notification/mutation that triggered it.
create or replace function public.dispatch_push_for_notification(p_notification_id uuid)
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
    body := jsonb_build_object('notification_id', p_notification_id::text)
  );
exception when others then
  return;
end;
$function$;
