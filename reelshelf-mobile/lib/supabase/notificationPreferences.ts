import { supabase } from './client';

export interface NotificationPreferences {
  followingActivity: boolean;
}

const defaults: NotificationPreferences = {
  followingActivity: true,
};

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function fetchNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const client = requireClient();
  const { data, error } = await client
    .from('notification_preferences')
    .select('following_activity')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return { followingActivity: data?.following_activity ?? defaults.followingActivity };
}

export async function updateFollowingActivityPreference(userId: string, followingActivity: boolean): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('notification_preferences')
    .upsert({ user_id: userId, following_activity: followingActivity, updated_at: new Date().toISOString() });

  if (error) throw error;
}
