import { supabase } from './client';

export interface ProfileData {
  username:        string | null;
  displayName:     string | null;
  avatarUrl:       string | null;
  bio:             string | null;
  favouriteFilm:   string | null;
  favouriteSeries: string | null;
  favouriteBook:   string | null;
}

export interface ProfileAggregates {
  savedItemsCount:   number;
  diaryEntriesCount: number;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function fetchProfile(userId: string): Promise<ProfileData | null> {
  const client = requireClient();
  const { data, error } = await client
    .from('profiles')
    .select('username, display_name, avatar_url, bio, favourite_film, favourite_series, favourite_book')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    username:        data.username,
    displayName:     data.display_name,
    avatarUrl:       data.avatar_url,
    bio:             data.bio,
    favouriteFilm:   data.favourite_film,
    favouriteSeries: data.favourite_series,
    favouriteBook:   data.favourite_book,
  };
}

export async function fetchProfileAggregates(userId: string): Promise<ProfileAggregates> {
  const client = requireClient();
  const [savedItems, diaryEntries] = await Promise.all([
    client.from('saved_items').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    client.from('diary_entries').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  if (savedItems.error) throw savedItems.error;
  if (diaryEntries.error) throw diaryEntries.error;
  return {
    savedItemsCount:   savedItems.count ?? 0,
    diaryEntriesCount: diaryEntries.count ?? 0,
  };
}
