import * as ImagePicker from 'expo-image-picker';

import { supabase } from './client';

export interface ProfileData {
  id:              string;
  username:        string | null;
  displayName:     string | null;
  avatarUrl:       string | null;
  bio:             string | null;
  favouriteFilm:   string | null;
  favouriteSeries: string | null;
  favouriteBook:   string | null;
  favouriteGenres: string[];
  createdAt:       string;
}

export interface ProfileStats {
  moviesWatched: number;
  tvWatched:     number;
  booksRead:     number;
  reviews:       number;
  lists:         number;
  followers:     number;
  following:     number;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function fetchProfile(userId: string): Promise<ProfileData | null> {
  const client = requireClient();
  const { data, error } = await client
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, favourite_film, favourite_series, favourite_book, favourite_genres, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id:              data.id,
    username:        data.username,
    displayName:     data.display_name,
    avatarUrl:       data.avatar_url,
    bio:             data.bio,
    favouriteFilm:   data.favourite_film,
    favouriteSeries: data.favourite_series,
    favouriteBook:   data.favourite_book,
    favouriteGenres: data.favourite_genres ?? [],
    createdAt:       data.created_at,
  };
}

/** Distinct-media_id count (rewatch-safe — multiple diary_entries rows for
 *  the same title must not inflate a "watched" count). PostgREST has no
 *  simple "count distinct", so this fetches just the media_id column and
 *  dedupes client-side — fine at per-user diary_entries scale. */
async function countDistinctMediaIds(userId: string, mediaType: 'movie' | 'tv' | 'book'): Promise<number> {
  const client = requireClient();
  const { data, error } = await client
    .from('diary_entries')
    .select('media_id')
    .eq('user_id', userId)
    .eq('media_type', mediaType)
    .not('watched_date', 'is', null);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.media_id as string)).size;
}

export async function fetchStats(userId: string): Promise<ProfileStats> {
  const client = requireClient();
  const [moviesWatched, tvWatched, booksRead, reviews, lists, followers, following] = await Promise.all([
    countDistinctMediaIds(userId, 'movie'),
    countDistinctMediaIds(userId, 'tv'),
    countDistinctMediaIds(userId, 'book'),
    client.from('diary_entries').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).not('review', 'is', null).neq('review', ''),
    client.from('user_lists').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    client.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    client.from('followers').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  if (reviews.error) throw reviews.error;
  if (lists.error) throw lists.error;
  if (followers.error) throw followers.error;
  if (following.error) throw following.error;

  return {
    moviesWatched,
    tvWatched,
    booksRead,
    reviews:   reviews.count ?? 0,
    lists:     lists.count ?? 0,
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  };
}

// ── Follow / unfollow ──────────────────────────────────────────────────────
export async function fetchFollowState(viewerId: string, targetId: string): Promise<boolean> {
  const client = requireClient();
  const { data, error } = await client
    .from('followers')
    .select('id')
    .eq('follower_id', viewerId)
    .eq('following_id', targetId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function followUser(viewerId: string, targetId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('followers').insert({ follower_id: viewerId, following_id: targetId });
  if (error) throw error;
}

export async function unfollowUser(viewerId: string, targetId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('followers').delete()
    .eq('follower_id', viewerId).eq('following_id', targetId);
  if (error) throw error;
}

// ── Edit Profile ────────────────────────────────────────────────────────────
export interface ProfileEditFields {
  displayName:     string;
  username:        string;
  bio:             string;
  favouriteGenres: string[];
  favouriteFilm:   string;
  favouriteSeries: string;
  favouriteBook:   string;
}

export async function updateProfile(userId: string, fields: ProfileEditFields): Promise<{ error: string | null }> {
  const client = requireClient();
  const { error } = await client.from('profiles').update({
    display_name:     fields.displayName || null,
    username:          fields.username || null,
    bio:               fields.bio || null,
    favourite_genres:  fields.favouriteGenres,
    favourite_film:    fields.favouriteFilm || null,
    favourite_series:  fields.favouriteSeries || null,
    favourite_book:    fields.favouriteBook || null,
    updated_at:        new Date().toISOString(),
  }).eq('id', userId);

  if (error) {
    if (error.code === '23505') return { error: 'That username is already taken.' };
    return { error: error.message };
  }
  return { error: null };
}

// ── Avatar upload — real image upload to the existing public "avatars" bucket ──
export async function pickAndUploadAvatar(userId: string): Promise<{ url: string | null; error: string | null }> {
  const client = requireClient();

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { url: null, error: 'Photo library permission is required to change your avatar.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) {
    return { url: null, error: null };
  }

  const asset = result.assets[0];
  const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  try {
    const response = await fetch(asset.uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await client.storage
      .from('avatars')
      .upload(path, arrayBuffer, {
        contentType: asset.mimeType || `image/${ext}`,
        upsert: true,
      });
    if (uploadError) return { url: null, error: uploadError.message };

    const { data: publicUrlData } = client.storage.from('avatars').getPublicUrl(path);
    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await client
      .from('profiles')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (updateError) return { url: null, error: updateError.message };

    return { url: publicUrl, error: null };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : 'Could not upload avatar.' };
  }
}
