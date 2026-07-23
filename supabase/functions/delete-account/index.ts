// Deletes the CALLING user's own account. Target user id is derived exclusively
// from the caller's verified JWT (never from request-body input) — this function
// cannot be used to delete any account other than the one the caller is
// authenticated as. Requires the service role key to call the Auth Admin API
// (supabase.auth.admin.deleteUser), which no client can safely hold.
//
// Security model:
//  1. Gateway-level JWT check (verify_jwt=true at deploy time) rejects any
//     request without a valid, unexpired access token before this code even runs.
//  2. This function independently re-verifies that token via auth.getUser() and
//     derives userId/email from it — the only source of truth for "who".
//  3. Server-side re-authentication: the caller must also supply their CURRENT
//     password in the request body. This function calls signInWithPassword with
//     the JWT-derived email (never a client-supplied email) + that password, and
//     requires the resulting session to belong to the same userId. This proves
//     the caller knows the real password RIGHT NOW — a merely-stolen/leftover
//     access token is not sufficient on its own, since deletion is gated on this
//     second, independent credential check happening inside the function.
//  4. Only after both checks pass does it touch Storage or auth.users.
//
// Order matters: Storage object paths are read from profiles.avatar_url and
// diary_entries.attachment_url (image type) and deleted from Storage BEFORE the
// auth user is deleted — deleting the auth user first would cascade-delete the
// diary_entries rows this function needs to know what to clean up in Storage.
// Storage is not covered by any FK cascade; auth.users -> every user-owned table
// (profiles, diary_entries + comments/likes/reactions, followers, list_likes,
// list_saves, mount_rushmore, notifications, review_comments, review_reactions,
// saved_items, trivia_answers, trivia_user_progress, user_badges, daily_picks,
// daily_progress, user_lists) all IS covered by ON DELETE CASCADE (confirmed via
// pg_constraint against confrelid = 'auth.users'::regclass), so a single
// auth.admin.deleteUser call is sufficient for all of that.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Public Storage URLs look like
 *  ".../storage/v1/object/public/<bucket>/<path>" — this recovers <path>. */
function pathFromPublicUrl(url: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    // Scoped to the CALLER's own JWT — used only to verify identity.
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: 'Invalid or expired session.' }, 401);
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email;
    if (!userEmail) {
      return json({ error: 'Account has no email on file — cannot verify password.' }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!password) {
      return json({ error: 'Password is required to confirm account deletion.' }, 400);
    }

    // Independent, server-side password re-verification — email comes from the
    // verified JWT above, never from the request body.
    const reauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: reauthData, error: reauthError } = await reauthClient.auth.signInWithPassword({
      email: userEmail,
      password,
    });
    if (reauthError || !reauthData?.user || reauthData.user.id !== userId) {
      return json({ error: 'Incorrect password.' }, 401);
    }

    // Service-role client — used ONLY from here on, only against `userId` derived
    // above, never against any client-supplied id.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Collect Storage object paths BEFORE deleting the auth user.
    const [{ data: profileRow }, { data: attachmentRows, error: attachError }] = await Promise.all([
      admin.from('profiles').select('avatar_url').eq('id', userId).maybeSingle(),
      admin
        .from('diary_entries')
        .select('attachment_url')
        .eq('user_id', userId)
        .eq('attachment_type', 'image')
        .not('attachment_url', 'is', null),
    ]);
    if (attachError) {
      return json({ error: `Failed to read attachments: ${attachError.message}` }, 500);
    }

    const avatarPath = profileRow?.avatar_url
      ? pathFromPublicUrl(profileRow.avatar_url, 'avatars')
      : null;
    const attachmentPaths = (attachmentRows ?? [])
      .map((r: { attachment_url: string | null }) =>
        r.attachment_url ? pathFromPublicUrl(r.attachment_url, 'review-attachments') : null,
      )
      .filter((p: string | null): p is string => Boolean(p));

    // 2. Delete the specific Storage objects. Best-effort per bucket — a
    //    Storage error is reported but does not block account deletion.
    const storageResults: Record<string, unknown> = {};
    if (avatarPath) {
      const { error } = await admin.storage.from('avatars').remove([avatarPath]);
      storageResults.avatar = error
        ? { path: avatarPath, error: error.message }
        : { path: avatarPath, deleted: true };
    }
    if (attachmentPaths.length > 0) {
      const { error } = await admin.storage.from('review-attachments').remove(attachmentPaths);
      storageResults.attachments = error
        ? { paths: attachmentPaths, error: error.message }
        : { paths: attachmentPaths, deleted: true };
    }

    // 3. Delete the auth user — triggers ON DELETE CASCADE across every
    //    user-owned table.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return json({ error: `Account deletion failed: ${deleteError.message}`, storageResults }, 500);
    }

    return json({ success: true, userId, storageResults }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
