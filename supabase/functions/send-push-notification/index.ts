// Called by database triggers (via pg_net, see public.dispatch_push_for_notification)
// after a notifications row is inserted — sends a real Expo push to every
// device the recipient has opted into, or silently no-ops if they have none.
//
// ALSO supports a second, narrower request shape for the Collection of the
// Week scheduling script's optional announcement (see
// public.dispatch_collection_announcement and
// scripts/schedule-collection-of-the-week.ts) — a broadcast to every
// registered device rather than one recipient looked up from a notifications
// row. This reuses 100% of the token-lookup + Expo-push-send code below;
// it does not write to the notifications table or the in-app bell's 7 real
// types, so it never appears there — push-only, exactly as scoped.
//
// verify_jwt is disabled at deploy time because this is called by a Postgres
// trigger or a locally-run admin script, not an authenticated end-user
// session — there is no user JWT to present. Custom auth instead: the
// caller must present x-webhook-secret matching the value in Supabase Vault
// (push_webhook_secret), checked via the verify_push_webhook_secret()
// SECURITY DEFINER RPC (vault.* isn't exposed to PostgREST directly, so
// this is the bridge).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: string;
  reference_id: string | null;
  reference_type: string | null;
}

interface ProfileRow {
  username: string | null;
  display_name: string | null;
}

interface DiaryRow {
  id: string;
  media_id: string;
  media_type: 'movie' | 'tv' | 'book';
  title: string;
  poster: string | null;
}

function toRouteId(mediaType: string, mediaId: string): string {
  const prefix = mediaType === 'movie' ? 'film' : mediaType;
  const bareId = mediaId.startsWith('tmdb-') ? mediaId.slice(5) : mediaId;
  return `${prefix}-${bareId}`;
}

function toMobileMediaType(mediaType: string): string {
  return mediaType === 'movie' ? 'film' : mediaType;
}

// Exact same actionText copy as lib/supabase/notifications.ts's builders on
// mobile — kept in sync deliberately (both trace back to the real website's
// builder functions read in full before either was written).
function actionTextFor(type: string, mediaTitle: string | null): string {
  const title = mediaTitle || 'a title';
  switch (type) {
    case 'new_follower': return 'started following you';
    case 'followed_user_mount_rushmore': return 'updated their Mount Rushmore';
    case 'followed_user_logged': return `logged ${title}`;
    case 'followed_user_reviewed': return `reviewed ${title}`;
    case 'review_liked': return `liked your log of ${title}`;
    case 'entry_commented': return `commented on your entry for ${title}`;
    case 'comment_replied': return `replied to your comment on ${title}`;
    default: return 'sent you an update';
  }
}

async function sendExpoPush(messages: { to: string; title: string; body: string; data: unknown }[]) {
  const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  return pushRes.json().catch(() => null);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const providedSecret = req.headers.get('x-webhook-secret') ?? '';
  const { data: isValid, error: secretErr } = await admin.rpc('verify_push_webhook_secret', { p_secret: providedSecret });
  if (secretErr || !isValid) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const body = await req.json().catch(() => ({}));

  // ── Collection of the Week announcement (broadcast) ──────────────────────
  const announcement = body?.collection_announcement as { slug?: string; title?: string } | undefined;
  if (announcement?.slug && announcement?.title) {
    const { data: tokens } = await admin.from('push_tokens').select('expo_push_token');
    if (!tokens || tokens.length === 0) {
      return json({ ok: true, skipped: 'no registered push tokens' }, 200);
    }
    const messages = (tokens as { expo_push_token: string }[]).map((t) => ({
      to: t.expo_push_token,
      title: 'ReelShelf',
      body: `This week's Collection: ${announcement.title}`,
      data: { type: 'collection_of_the_week', collectionSlug: announcement.slug },
    }));
    const expoResponse = await sendExpoPush(messages);
    return json({ ok: true, sent: messages.length, expoResponse }, 200);
  }

  // ── Existing single-recipient notification path ──────────────────────────
  const notificationId = typeof body?.notification_id === 'string' ? body.notification_id : null;
  if (!notificationId) return json({ error: 'notification_id or collection_announcement is required' }, 400);

  const { data: notif, error: notifErr } = await admin
    .from('notifications')
    .select('id, recipient_id, actor_id, type, reference_id, reference_type')
    .eq('id', notificationId)
    .maybeSingle();
  if (notifErr || !notif) return json({ ok: true, skipped: 'notification not found' }, 200);
  const row = notif as NotificationRow;

  // Silent no-op — no token, nothing to do. Never an error.
  const { data: tokens } = await admin
    .from('push_tokens')
    .select('expo_push_token')
    .eq('user_id', row.recipient_id);
  if (!tokens || tokens.length === 0) {
    return json({ ok: true, skipped: 'recipient has no registered push token' }, 200);
  }

  const [{ data: actor }, entryRes] = await Promise.all([
    admin.from('profiles').select('username, display_name').eq('id', row.actor_id).maybeSingle(),
    row.reference_type === 'diary_entry' && row.reference_id
      ? admin.from('diary_entries').select('id, media_id, media_type, title, poster').eq('id', row.reference_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const entry = (entryRes as { data: DiaryRow | null }).data;
  const actorProfile = actor as ProfileRow | null;
  const actorName = actorProfile?.display_name || actorProfile?.username || 'Someone';

  const mediaRouteId = entry ? toRouteId(entry.media_type, entry.media_id) : null;
  const mediaType = entry ? toMobileMediaType(entry.media_type) : null;

  const title = 'ReelShelf';
  const bodyText = `${actorName} ${actionTextFor(row.type, entry?.title ?? null)}`;
  const data = {
    type: row.type,
    actorId: row.actor_id,
    mediaRouteId,
    mediaType,
    mediaTitle: entry?.title ?? null,
    mediaPoster: entry?.poster ?? null,
  };

  const messages = (tokens as { expo_push_token: string }[]).map((t) => ({
    to: t.expo_push_token,
    title,
    body: bodyText,
    data,
  }));

  const expoResponse = await sendExpoPush(messages);
  return json({ ok: true, sent: messages.length, expoResponse }, 200);
});
