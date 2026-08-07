-- Lets the Edge Function (which can only reach the public schema via
-- PostgREST, not the vault schema directly) verify an incoming request's
-- x-webhook-secret header against the real value in Vault, without ever
-- exposing the secret itself back to the caller.
create or replace function public.verify_push_webhook_secret(p_secret text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  return v_secret is not null and v_secret = p_secret;
end;
$function$;

revoke all on function public.verify_push_webhook_secret(text) from public, anon, authenticated;
grant execute on function public.verify_push_webhook_secret(text) to service_role;
