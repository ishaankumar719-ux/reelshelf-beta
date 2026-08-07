-- This is only ever meant to be called internally by the notification
-- triggers (which, as SECURITY DEFINER functions themselves, remain able to
-- call it regardless of this revoke). Without this, any authenticated/anon
-- client could call it directly via PostgREST with an arbitrary
-- notification_id, forcing a redundant real push resend for any existing
-- notification row — a minor but real abuse vector caught by get_advisors.
revoke all on function public.dispatch_push_for_notification(uuid) from public, anon, authenticated;
