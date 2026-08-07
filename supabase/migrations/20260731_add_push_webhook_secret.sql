select vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'push_webhook_secret', 'Shared secret between notification triggers and send-push-notification Edge Function')
where not exists (select 1 from vault.secrets where name = 'push_webhook_secret');
