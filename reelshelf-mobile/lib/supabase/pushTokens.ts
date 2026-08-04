// push_tokens — one row per (user, device). Real Expo push tokens only,
// never logged (console output here always redacts).
import { supabase } from './client';

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function upsertPushToken(
  userId: string,
  expoPushToken: string,
  devicePlatform: 'ios' | 'android',
): Promise<{ error: string | null }> {
  const client = requireClient();
  const { error } = await client.from('push_tokens').upsert(
    { user_id: userId, expo_push_token: expoPushToken, device_platform: devicePlatform, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,expo_push_token' },
  );
  return { error: error ? error.message : null };
}

export async function deletePushToken(userId: string, expoPushToken: string): Promise<void> {
  const client = requireClient();
  await client.from('push_tokens').delete().eq('user_id', userId).eq('expo_push_token', expoPushToken);
}

export async function hasAnyPushToken(userId: string): Promise<boolean> {
  const client = requireClient();
  const { data } = await client.from('push_tokens').select('id').eq('user_id', userId).limit(1).maybeSingle();
  return !!data;
}
