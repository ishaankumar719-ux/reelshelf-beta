-- Hourly cleanup of message media that was uploaded but never sent
-- (supabase/functions/message-media-sweeper). Safe to run more than once.
--
-- After applying, once per environment, store the project URL the job calls:
--   select vault.create_secret('https://<project-ref>.supabase.co', 'message_media_sweeper_url');
-- Until then the job does nothing and logs a warning.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The trigger secret the Edge Function checks. Generated here, never in git.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'message_media_sweeper_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'message_media_sweeper_secret',
      'Checked by the message-media-sweeper Edge Function'
    );
  end if;
end;
$$;

create or replace function public.run_message_media_sweeper()
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_secret text;
  v_url text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'message_media_sweeper_secret' limit 1;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'message_media_sweeper_url' limit 1;
  if v_secret is null or v_url is null then
    raise warning 'message media sweeper is not configured (missing vault secret)';
    return null;
  end if;
  return net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/message-media-sweeper',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-sweeper-secret', v_secret),
    body := '{}'::jsonb
  );
end;
$$;
revoke all on function public.run_message_media_sweeper() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'message-media-sweeper';
select cron.schedule('message-media-sweeper', '17 * * * *', 'select public.run_message_media_sweeper()');
